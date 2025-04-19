package services

import (
	"context"
	"fmt"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/utils"
	"github.com/zmb3/spotify/v2"
)

type PlaylistService struct {
	userSelectionDAO dao.UserSelectionDAO
	spotifyService   *SpotifyService
}

func NewPlaylistService(userSelectionDAO dao.UserSelectionDAO, spotifyService *SpotifyService) *PlaylistService {
	return &PlaylistService{
		userSelectionDAO: userSelectionDAO,
		spotifyService:   spotifyService,
	}
}

func (s *PlaylistService) CreateYearlyPlaylist(ctx context.Context, userID string, spotifyToken string, year int, mode string, includeCandidates bool) error {
	// Get all tracks for the year based on mode and includeCandidates
	selectionRoles := []string{mode + "_selected"}
	if includeCandidates {
		selectionRoles = append(selectionRoles, mode+"_candidate")
	}

	// Get user's selections for the year
	selections, err := s.userSelectionDAO.GetUserSelectionsForYear(ctx, userID, year, "track", selectionRoles)
	if err != nil {
		return fmt.Errorf("failed to get selections: %w", err)
	}

	if len(selections) == 0 {
		return fmt.Errorf("no tracks found for year %d", year)
	}

	// Create Spotify client
	client := utils.CreateTemporarySpotifyClient(ctx, spotifyToken)

	// Get user ID from Spotify
	user, err := client.CurrentUser(ctx)
	if err != nil {
		return fmt.Errorf("failed to get Spotify user: %w", err)
	}

	// Create playlist
	playlistName := fmt.Sprintf("%d %ss", year, mode)
	description := fmt.Sprintf("My %s tracks from %d", mode, year)
	playlist, err := client.CreatePlaylistForUser(ctx, user.ID, playlistName, description, false, false)
	if err != nil {
		return fmt.Errorf("failed to create playlist: %w", err)
	}

	// Add tracks in batches of 100 (Spotify API limit)
	var trackIDs []spotify.ID
	for _, selection := range selections {
		trackIDs = append(trackIDs, spotify.ID(selection.SpotifyItemID))
	}

	const batchSize = 100
	for i := 0; i < len(trackIDs); i += batchSize {
		end := i + batchSize
		if end > len(trackIDs) {
			end = len(trackIDs)
		}
		batch := trackIDs[i:end]
		_, err = client.AddTracksToPlaylist(ctx, playlist.ID, batch...)
		if err != nil {
			return fmt.Errorf("failed to add tracks to playlist: %w", err)
		}
	}

	return nil
}
