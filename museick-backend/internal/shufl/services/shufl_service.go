package services

import (
	"context"
	"fmt"
	"log"

	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/internal/shufl/dao"
	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
)

type ShuflService struct {
	spotifyService     *services.SpotifyService
	enrichedTrackDAO   dao.EnrichedTrackDAO
	queueService       *QueueService       // Added QueueService dependency
	activeQueueService *ActiveQueueService // Added ActiveQueueService dependency
}

func NewShuflService(
	spotifyService *services.SpotifyService,
	enrichedTrackDAO dao.EnrichedTrackDAO,
	queueService *QueueService, // Added to constructor
	activeQueueService *ActiveQueueService, // Added to constructor
) *ShuflService {
	return &ShuflService{
		spotifyService:     spotifyService,
		enrichedTrackDAO:   enrichedTrackDAO,
		queueService:       queueService,       // Assigned in constructor
		activeQueueService: activeQueueService, // Assigned in constructor
	}
}

func (s *ShuflService) EnrichTrack(ctx context.Context, userID string, spotifyID string, accessToken string) (*models.EnrichedTrack, error) {
	// Get track data from Spotify
	trackData, err := s.spotifyService.MakeSpotifyAPIRequest("GET", "https://api.spotify.com/v1/tracks/"+spotifyID, accessToken, nil)
	if err != nil {
		log.Printf("Failed to get track data: %v", err)
		return nil, err
	}
	log.Printf("Got track data: %+v", trackData)

	// Get audio features
	audioFeatures, err := s.spotifyService.MakeSpotifyAPIRequest("GET", "https://api.spotify.com/v1/audio-features/"+spotifyID, accessToken, nil)
	if err != nil {
		log.Printf("Failed to get audio features: %v", err)
		return nil, err
	}
	log.Printf("Got audio features: %+v", audioFeatures)

	// TODO: Get album and artist data for genres

	// Build enriched track
	enrichedTrack := &models.EnrichedTrack{
		UserID:    userID,
		SpotifyID: spotifyID,
		// TODO: Map other fields from responses
	}

	// Store in database
	if err := s.enrichedTrackDAO.Upsert(ctx, enrichedTrack); err != nil {
		log.Printf("Failed to store enriched track: %v", err)
		return nil, err
	}

	return enrichedTrack, nil
}

// GetShuffledQueue generates a new queue based on user preferences and library
func (s *ShuflService) GetShuffledQueue(ctx context.Context, userID string, params models.ShuffleParams) ([]models.EnrichedTrack, error) {
	// 1. Get User Preferences (ShufflePreferences)
	// TODO: Fetch actual user preferences
	prefs := &models.ShufflePreferences{
		// Populate with default or fetched preferences
	}

	// 2. Generate Queue using QueueService
	trackIDs, err := s.queueService.GenerateQueue(ctx, userID, prefs)
	if err != nil {
		return nil, fmt.Errorf("failed to generate queue: %w", err)
	}

	// 3. Fetch EnrichedTrack details for the queue
	enrichedTracks, err := s.enrichedTrackDAO.GetByIDs(ctx, trackIDs) // Corrected method name
	if err != nil {
		return nil, fmt.Errorf("failed to fetch enriched tracks for queue: %w", err)
	}

	// 4. Re-order enrichedTracks based on the generated trackIDs order
	orderedTracks := make([]models.EnrichedTrack, len(trackIDs))
	trackMap := make(map[string]models.EnrichedTrack)
	for _, track := range enrichedTracks {
		// Need to dereference the pointer from GetByIDs result
		if track != nil {
			trackMap[track.SpotifyID] = *track
		}
	}

	for i, id := range trackIDs {
		if track, ok := trackMap[id]; ok {
			orderedTracks[i] = track
		} else {
			// Handle case where an ID in the queue wasn't found in enriched tracks (should ideally not happen)
			return nil, fmt.Errorf("track ID %s from generated queue not found in enriched data", id)
		}
	}

	return orderedTracks, nil
}
