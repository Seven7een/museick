package services

import (
	"context"
	"fmt"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SongService struct {
	songDAO *dao.SongDAO // Assuming you have a DAO for songs
}

func NewSongService(songDAO *dao.SongDAO) *SongService {
	return &SongService{songDAO}
}

// CreateSong adds a new song entry to the database
func (s *SongService) CreateSong(ctx context.Context, userID string, spotifyID string, name string, artists []string, albumName string) (*models.Song, error) {
	now := primitive.NewDateTimeFromTime(time.Now())
	song := &models.Song{
		UserID:    userID,
		SpotifyID: spotifyID,
		Name:      name,
		Artists:   artists,
		AlbumName: albumName,
		AddedAt:   now,
		UpdatedAt: now,
	}

	err := s.songDAO.InsertSong(ctx, song)
	if err != nil {
		return nil, fmt.Errorf("failed to insert song: %w", err)
	}
	// The InsertOne operation doesn't automatically populate the ID in the passed struct.
	// If the ID is needed immediately after creation, you might need to fetch it separately
	// or modify the DAO to return the inserted ID. For now, returning the struct as is.
	return song, nil
}

// GetSong retrieves a song by its ID
func (s *SongService) GetSongByID(ctx context.Context, songID string) (*models.Song, error) {
	// TODO: Validate songID format if necessary (e.g., is it a valid ObjectID hex?)
	return s.songDAO.GetSongByID(ctx, songID)
}

// ListSongs retrieves a list of all songs for a specific user
func (s *SongService) ListSongs(ctx context.Context, userID string) ([]*models.Song, error) {
	if userID == "" {
		return nil, fmt.Errorf("user ID cannot be empty")
	}
	return s.songDAO.ListSongs(ctx, userID)
}

// TODO: Add UpdateSong and DeleteSong methods if needed
// func (s *SongService) UpdateSong(ctx context.Context, songID string, updates map[string]interface{}) (*models.Song, error) {
// 	// Ensure UpdatedAt is set
// 	updates["updated_at"] = primitive.NewDateTimeFromTime(time.Now())
// 	// Call DAO update method
// 	// ...
// 	return s.songDAO.UpdateSong(ctx, songID, updates) // Assuming DAO has UpdateSong
// }

// func (s *SongService) DeleteSong(ctx context.Context, songID string) error {
// 	// Call DAO delete method
// 	// ...
// 	return s.songDAO.DeleteSong(ctx, songID) // Assuming DAO has DeleteSong
// }

// Example of a more complex method (placeholder)
// func (s *SongService) GetUserMonthlySelection(ctx context.Context, userID string, year int, month int, mode string) (*models.Song, error) {
// 	// Logic to find the specific selection based on criteria
// 	// This would likely involve a more complex DAO query
// 	// ...
// 	return nil, fmt.Errorf("not implemented")
// }
