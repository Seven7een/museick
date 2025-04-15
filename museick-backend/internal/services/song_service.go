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
	// Create a new Song model based on provided data
	newSong := &models.Song{
		UserID:    userID,
		SpotifyID: spotifyID,
		Name:      name,
		Artists:   artists,
		AlbumName: albumName,
		AddedAt:   primitive.NewDateTimeFromTime(time.Now()), // Set the added_at timestamp
		UpdatedAt: primitive.NewDateTimeFromTime(time.Now()), // Set the updated_at timestamp
	}

	// Save the song to the database using the DAO
	err := s.songDAO.InsertSong(ctx, newSong)
	if err != nil {
		return nil, fmt.Errorf("error creating new song: %v", err)
	}

	return newSong, nil
}

// GetSong retrieves a song by its ID
func (s *SongService) GetSongByID(ctx context.Context, songID string) (*models.Song, error) {
	song, err := s.songDAO.GetSongByID(ctx, songID)
	if err != nil {
		return nil, fmt.Errorf("error fetching song: %v", err)
	}
	return song, nil
}

// ListSongs retrieves a list of all songs for a specific user
func (s *SongService) ListSongs(ctx context.Context, userID string) ([]*models.Song, error) {
	songs, err := s.songDAO.ListSongs(ctx, userID) // Pass userID to the DAO method
	if err != nil {
		return nil, fmt.Errorf("error listing songs: %v", err)
	}
	return songs, nil
}

// // FetchSongDetails retrieves song data from Spotify by its ID
// func (s *SongService) FetchSongDetails(ctx context.Context, songID string) (*models.Song, error) {
// 	// Spotify Client interaction
// 	song, err := s.spotifyClient.GetSongDetails(ctx, songID)
// 	if err != nil {
// 		return nil, fmt.Errorf("error fetching song details from Spotify: %v", err)
// 	}

// 	// Returning song details
// 	return &models.Song{
// 		SpotifyID: song.ID,
// 		Name:      song.Name,
// 		Artists:   song.Artists,
// 		AlbumName: song.AlbumName,
// 		AddedAt:   primitive.NewDateTimeFromTime(time.Now()),  // Timestamp for when the song was added
// 		UpdatedAt: primitive.NewDateTimeFromTime(time.Now()),  // Timestamp for when the song was last updated
// 	}, nil
// }
