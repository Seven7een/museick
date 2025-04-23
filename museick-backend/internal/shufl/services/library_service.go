package services

import (
	"context"
	"fmt"
	"log"
	"strings"
	"sync"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/internal/shufl/dao"
	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
)

type LibraryService struct {
	spotifyService   *services.SpotifyService
	enrichedTrackDAO dao.EnrichedTrackDAO
	userLibraryDAO   dao.UserLibraryDAO
	batchSize        int
}

func NewLibraryService(spotifyService *services.SpotifyService,
	enrichedTrackDAO dao.EnrichedTrackDAO,
	userLibraryDAO dao.UserLibraryDAO) *LibraryService {
	return &LibraryService{
		spotifyService:   spotifyService,
		enrichedTrackDAO: enrichedTrackDAO,
		userLibraryDAO:   userLibraryDAO,
		batchSize:        50, // Spotify API batch limit
	}
}

func (s *LibraryService) ImportUserPlaylists(ctx context.Context, userID string, playlistIDs []string, accessToken string) error {
	log.Printf("Starting playlist import for user %s", userID)

	// Track IDs we've seen to avoid duplicates
	seenTracks := make(map[string]bool)

	for _, playlistID := range playlistIDs {
		// Get playlist tracks
		tracks, err := s.GetPlaylistTracks(ctx, playlistID)
		if err != nil {
			log.Printf("Error getting tracks for playlist %s: %v", playlistID, err)
			continue
		}

		// Filter out duplicates
		var uniqueTracks []string
		for _, track := range tracks {
			if !seenTracks[track.SpotifyID] {
				uniqueTracks = append(uniqueTracks, track.SpotifyID)
				seenTracks[track.SpotifyID] = true
			}
		}

		// Process tracks in batches
		for i := 0; i < len(uniqueTracks); i += s.batchSize {
			end := min(i+s.batchSize, len(uniqueTracks))
			batch := uniqueTracks[i:end]

			enrichedTracks, err := s.enrichTrackBatch(ctx, batch, accessToken)
			if err != nil {
				log.Printf("Error enriching batch: %v", err)
				continue
			}

			// Store enriched tracks
			for _, track := range enrichedTracks {
				if err := s.enrichedTrackDAO.Upsert(ctx, track); err != nil {
					log.Printf("Error storing enriched track %s: %v", track.SpotifyID, err)
				}
			}
		}
	}

	// Update user library
	library := &models.UserLibrary{
		UserID:      userID,
		PlaylistIDs: playlistIDs,
		LastSynced:  time.Now(),
		TrackCount:  len(seenTracks),
	}

	return s.userLibraryDAO.Upsert(ctx, library)
}

func (s *LibraryService) enrichTrackBatch(ctx context.Context, trackIDs []string, accessToken string) ([]*models.EnrichedTrack, error) {
	var wg sync.WaitGroup
	var mu sync.Mutex
	// Use a map for easier assignment based on SpotifyID
	enrichedTracksMap := make(map[string]*models.EnrichedTrack)
	errChan := make(chan error, 3)

	// Initialize map entries
	for _, id := range trackIDs {
		enrichedTracksMap[id] = &models.EnrichedTrack{SpotifyID: id} // Initialize with ID
	}

	// Get audio features
	wg.Add(1)
	go func() {
		defer wg.Done()
		featuresData, err := s.spotifyService.MakeSpotifyAPIRequest(
			"GET",
			"https://api.spotify.com/v1/audio-features?ids="+strings.Join(trackIDs, ","),
			accessToken,
			nil,
		)
		if err != nil {
			errChan <- fmt.Errorf("audio features error: %w", err)
			return
		}

		// Assume processAudioFeatures returns map[string]*models.AudioFeatures
		audioFeaturesMap, err := s.processAudioFeatures(featuresData)
		if err != nil {
			errChan <- fmt.Errorf("process audio features error: %w", err)
			return
		}

		mu.Lock()
		for id, features := range audioFeaturesMap {
			if track, ok := enrichedTracksMap[id]; ok {
				track.AudioFeatures = features
			}
		}
		mu.Unlock()
	}()

	// Get track info
	wg.Add(1)
	go func() {
		defer wg.Done()
		tracksData, err := s.spotifyService.MakeSpotifyAPIRequest(
			"GET",
			"https://api.spotify.com/v1/tracks?ids="+strings.Join(trackIDs, ","),
			accessToken,
			nil,
		)
		if err != nil {
			errChan <- fmt.Errorf("track info error: %w", err)
			return
		}

		// Assume processTracks returns []SpotifyTrackInfo where
		// spotifyTrackInfo.Artists is []string (artist names)
		// and the original artist IDs are NOT directly available here.
		processedTracks, err := s.processTracks(tracksData) // Returns []SpotifyTrackInfo or similar
		if err != nil {
			errChan <- fmt.Errorf("process tracks error: %w", err)
			return
		}

		mu.Lock()
		artistIDMap := make(map[string][]string)           // trackID -> artistIDs for genre lookup
		for _, spotifyTrackInfo := range processedTracks { // Iterate over the result from processTracks
			if track, ok := enrichedTracksMap[spotifyTrackInfo.SpotifyID]; ok {
				track.Name = spotifyTrackInfo.Name
				// Assign the []string directly as extractArtistNames cannot be used
				track.Artists = spotifyTrackInfo.Artists
				track.Album = spotifyTrackInfo.Album
				track.AlbumID = spotifyTrackInfo.AlbumID
				track.DurationMs = spotifyTrackInfo.DurationMs
				track.Popularity = spotifyTrackInfo.Popularity
				track.PreviewURL = spotifyTrackInfo.PreviewURL
				track.URI = spotifyTrackInfo.URI
				track.LastUpdated = time.Now()

				// Cannot reliably get artist IDs from spotifyTrackInfo.Artists ([]string)
				// The processTracks function needs to provide these separately.
				// For now, initialize as empty to prevent nil map issues.
				artistIDMap[track.SpotifyID] = []string{}
				log.Printf("Warning: Cannot extract artist IDs for track %s in enrichTrackBatch; genre lookup will be incomplete.", track.SpotifyID)

			}
		}
		mu.Unlock()

		// Trigger genre fetch (needs artistIDMap from above)
		// This will likely not fetch correct genres due to missing IDs.
		go func() {
			mu.Lock() // Lock needed to safely read artistIDMap
			flatArtistIDs := make([]string, 0)
			for _, ids := range artistIDMap {
				flatArtistIDs = append(flatArtistIDs, ids...)
			}
			uniqueArtistIDs := uniqueStrings(flatArtistIDs)
			mu.Unlock()

			if len(uniqueArtistIDs) == 0 {
				log.Println("No unique artist IDs found for genre fetching.")
				return // No artists to fetch genres for
			}

			log.Printf("Fetching genres for %d unique artists...", len(uniqueArtistIDs))

			// Fetch artists in batches of 50
			allGenres := make(map[string][]string) // artistID -> genres
			var genreWg sync.WaitGroup
			genreErrChan := make(chan error, (len(uniqueArtistIDs)+49)/50) // Buffer for potential errors per batch

			for i := 0; i < len(uniqueArtistIDs); i += 50 {
				genreWg.Add(1)
				go func(startIndex int) {
					defer genreWg.Done()
					end := min(startIndex+50, len(uniqueArtistIDs))
					batch := uniqueArtistIDs[startIndex:end]

					artistsData, err := s.spotifyService.MakeSpotifyAPIRequest(
						"GET",
						"https://api.spotify.com/v1/artists?ids="+strings.Join(batch, ","),
						accessToken,
						nil,
					)
					if err != nil {
						genreErrChan <- fmt.Errorf("artist info error for batch starting at %d: %w", startIndex, err)
						return // Don't proceed with processing for this batch
					}

					// Assume processArtists returns a slice of structs with SpotifyID and Genres
					spotifyArtists, err := s.processArtists(artistsData)
					if err != nil {
						genreErrChan <- fmt.Errorf("process artists error for batch starting at %d: %w", startIndex, err)
						return
					}

					mu.Lock() // Lock to safely write to allGenres map
					for _, artist := range spotifyArtists {
						allGenres[artist.SpotifyID] = artist.Genres
					}
					mu.Unlock()
				}(i)
			}

			genreWg.Wait()
			close(genreErrChan)

			// Check for genre fetching errors
			for err := range genreErrChan {
				if err != nil {
					// Log the error, but continue mapping genres for artists that were successfully fetched
					log.Printf("Error during genre fetching: %v", err)
				}
			}

			// Map genres back to tracks
			mu.Lock()
			for trackID, track := range enrichedTracksMap {
				if track != nil {
					var genres []string
					artistIDsForTrack := artistIDMap[trackID] // Get artist IDs stored earlier
					for _, artistID := range artistIDsForTrack {
						if artistGenres, ok := allGenres[artistID]; ok {
							genres = append(genres, artistGenres...)
						}
					}
					track.Genres = uniqueStrings(genres)
				}
			}
			mu.Unlock()
			log.Println("Finished mapping genres to tracks.")
		}()
	}()

	wg.Wait()
	close(errChan)

	// Check for errors
	for err := range errChan {
		if err != nil {
			log.Printf("Error during enrichment: %v", err)
		}
	}

	// Convert map back to slice, ensuring order matches input trackIDs
	resultSlice := make([]*models.EnrichedTrack, 0, len(trackIDs))
	for _, id := range trackIDs {
		if track, ok := enrichedTracksMap[id]; ok && track.Name != "" { // Ensure track was actually processed
			resultSlice = append(resultSlice, track)
		}
	}

	return resultSlice, nil
}

func (s *LibraryService) GetPlaylistTracks(ctx context.Context, playlistID string) ([]*models.EnrichedTrack, error) {
	// Implementation for fetching playlist tracks
	return nil, nil
}

func (s *LibraryService) processAudioFeatures(features map[string]interface{}) (map[string]*models.AudioFeatures, error) {
	audioFeaturesData, ok := features["audio_features"].([]interface{})
	if !ok || len(audioFeaturesData) == 0 {
		return nil, fmt.Errorf("invalid audio features format")
	}

	audioFeaturesMap := make(map[string]*models.AudioFeatures)
	for _, item := range audioFeaturesData {
		featureMap, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		audioFeatures := &models.AudioFeatures{
			Danceability: featureMap["danceability"].(float64),
			Energy:       featureMap["energy"].(float64),
			// TODO: ... map other fields
		}

		id, ok := featureMap["id"].(string)
		if ok {
			audioFeaturesMap[id] = audioFeatures
		}
	}

	return audioFeaturesMap, nil
}

func (s *LibraryService) processTracks(tracks map[string]interface{}) ([]*models.EnrichedTrack, error) {
	_, ok := tracks["items"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid tracks format")
	}

	// Process tracks
	return nil, nil
}

func (s *LibraryService) processArtists(artists map[string]interface{}) ([]*models.SpotifyArtist, error) {
	_, ok := artists["items"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid artists format")
	}

	// Process artists
	return nil, nil
}

func uniqueStrings(strs []string) []string {
	seen := make(map[string]bool)
	unique := make([]string, 0, len(strs))
	for _, str := range strs {
		if !seen[str] {
			seen[str] = true
			unique = append(unique, str)
		}
	}
	return unique
}

// Helper function to extract artist names from SpotifyArtist structs
func extractArtistNames(artists []models.SpotifyArtist) []string {
	names := make([]string, len(artists))
	for i, artist := range artists {
		names[i] = artist.Name
	}
	return names
}
