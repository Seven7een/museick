package services

import (
	"context"
	"fmt"
	"log"
	"sort"
	"strings"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/pkg/utils"
)

type PlayerService struct {
	spotifyService *services.SpotifyService
}

func NewPlayerService(spotifyService *services.SpotifyService) *PlayerService {
	return &PlayerService{
		spotifyService: spotifyService,
	}
}

func (s *PlayerService) GetPlayerState(ctx context.Context, accessToken string) (map[string]interface{}, error) {
	result, err := s.spotifyService.MakeSpotifyAPIRequest(
		"GET",
		"https://api.spotify.com/v1/me/player",
		accessToken,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get player state: %w", err)
	}
	return result, nil
}

func (s *PlayerService) ClearQueue(ctx context.Context, accessToken string) error {
	// Get current queue
	queue, err := s.spotifyService.GetQueue(accessToken)
	if err != nil {
		return fmt.Errorf("failed to get queue: %w", err)
	}

	queueItems, ok := queue["queue"].([]interface{})
	if !ok {
		return nil // No queue to clear
	}

	// Spotify doesn't provide a direct way to clear the queue
	// We'll skip through all tracks in the queue
	for range queueItems {
		_, err := s.spotifyService.MakeSpotifyAPIRequest(
			"POST",
			"https://api.spotify.com/v1/me/player/next",
			accessToken,
			nil,
		)
		if err != nil {
			return fmt.Errorf("failed to skip track: %w", err)
		}
		// Small delay to prevent rate limiting
		time.Sleep(100 * time.Millisecond)
	}

	return nil
}

func (s *PlayerService) AddToQueue(ctx context.Context, accessToken string, trackID string) error {
	if err := s.spotifyService.AddToQueue(accessToken, "spotify:track:"+trackID); err != nil {
		return fmt.Errorf("failed to add track to queue: %w", err)
	}
	return nil
}

func (s *PlayerService) ControlPlayback(ctx context.Context, accessToken string, action string) error {
	var endpoint string
	var method string
	switch action {
	case "play":
		endpoint = "play"
		method = "PUT"
	case "pause":
		endpoint = "pause"
		method = "PUT"
	case "next":
		endpoint = "next"
		method = "POST"
	case "previous":
		endpoint = "previous"
		method = "POST"
	default:
		return fmt.Errorf("unsupported playback action: %s", action)
	}

	_, err := s.spotifyService.MakeSpotifyAPIRequest(
		method,
		"https://api.spotify.com/v1/me/player/"+endpoint,
		accessToken,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to control playback: %w", err)
	}

	return nil
}

type PlaylistInfo struct {
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Tracks int      `json:"tracks"`
	Genres []string `json:"genres,omitempty"`
}

func (s *PlayerService) GetUserPlaylists(ctx context.Context, accessToken string) ([]PlaylistInfo, error) {
	// Get user's playlists from Spotify
	result, err := s.spotifyService.MakeSpotifyAPIRequest(
		"GET",
		"https://api.spotify.com/v1/me/playlists?limit=50",
		accessToken,
		nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get playlists: %w", err)
	}

	items, ok := result["items"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("invalid playlist response format")
	}

	playlists := make([]PlaylistInfo, 0, len(items))
	for _, item := range items {
		playlist, ok := item.(map[string]interface{})
		if !ok {
			continue
		}

		// Extract basic playlist info
		id, _ := playlist["id"].(string)
		name, _ := playlist["name"].(string)
		tracks, ok := playlist["tracks"].(map[string]interface{})
		if !ok {
			continue
		}
		total, _ := tracks["total"].(float64)

		// Skip empty playlists
		if total == 0 {
			continue
		}

		playlists = append(playlists, PlaylistInfo{
			ID:     id,
			Name:   name,
			Tracks: int(total),
		})
	}

	// For each playlist, get a sample of tracks to determine genres
	for i := range playlists {
		// Get first page of tracks from playlist
		tracks, err := s.spotifyService.MakeSpotifyAPIRequest(
			"GET",
			fmt.Sprintf("https://api.spotify.com/v1/playlists/%s/tracks?limit=50", playlists[i].ID),
			accessToken,
			nil,
		)
		if err != nil {
			log.Printf("Warning: Could not get tracks for playlist %s: %v", playlists[i].ID, err)
			continue
		}

		items, ok := tracks["items"].([]interface{})
		if !ok {
			continue
		}

		// Collect artist IDs from tracks
		artistIDs := make([]string, 0)
		for _, item := range items {
			trackObj, ok := item.(map[string]interface{})
			if !ok {
				continue
			}
			track, ok := trackObj["track"].(map[string]interface{})
			if !ok {
				continue
			}
			artists, ok := track["artists"].([]interface{})
			if !ok {
				continue
			}
			for _, artist := range artists {
				artistObj, ok := artist.(map[string]interface{})
				if !ok {
					continue
				}
				if id, ok := artistObj["id"].(string); ok {
					artistIDs = append(artistIDs, id)
				}
			}
		}

		// Get unique artist IDs
		seen := make(map[string]bool)
		uniqueArtistIDs := make([]string, 0)
		for _, id := range artistIDs {
			if !seen[id] {
				seen[id] = true
				uniqueArtistIDs = append(uniqueArtistIDs, id)
			}
		}

		// Get genres for artists (in batches of 50)
		genres := make(map[string]bool)
		for j := 0; j < len(uniqueArtistIDs); j += 50 {
			end := utils.Min(j+50, len(uniqueArtistIDs))
			batch := uniqueArtistIDs[j:end]

			artists, err := s.spotifyService.MakeSpotifyAPIRequest(
				"GET",
				"https://api.spotify.com/v1/artists?ids="+strings.Join(batch, ","),
				accessToken,
				nil,
			)
			if err != nil {
				continue
			}

			artistsArr, ok := artists["artists"].([]interface{})
			if !ok {
				continue
			}

			for _, artist := range artistsArr {
				artistObj, ok := artist.(map[string]interface{})
				if !ok {
					continue
				}
				genresList, ok := artistObj["genres"].([]interface{})
				if !ok {
					continue
				}
				for _, g := range genresList {
					if genre, ok := g.(string); ok {
						genres[genre] = true
					}
				}
			}
		}

		// Convert genres map to slice
		genreSlice := make([]string, 0, len(genres))
		for genre := range genres {
			genreSlice = append(genreSlice, genre)
		}
		sort.Strings(genreSlice)

		// Update playlist genres
		playlists[i].Genres = genreSlice
	}

	return playlists, nil
}
