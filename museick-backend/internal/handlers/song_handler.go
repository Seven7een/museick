package handlers

import (
	"fmt"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/internal/models"
)

type SongHandler struct {
	SongService *services.SongService
}

func NewSongHandler(s *services.SongService) *SongHandler {
	return &SongHandler{
		SongService: s,
	}
}

// CreateSong handles creating a song
func (h *SongHandler) CreateSong(c *gin.Context) {
	var newSong models.Song
	if err := c.ShouldBindJSON(&newSong); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid song data"})
		return
	}

	// Retrieve user ID from the context
	userID := c.GetString("user_id")

	// Pass user ID to the service along with song data
	createdSong, err := h.SongService.CreateSong(c, userID, newSong.SpotifyID, newSong.Name, newSong.Artists, newSong.AlbumName)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creating song: %s", err)})
		return
	}

	c.JSON(http.StatusOK, createdSong)
}


// GetSong handles fetching a song by its ID
func (h *SongHandler) GetSong(c *gin.Context) {
	songID := c.Param("id")
	if songID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Song ID is required"})
		return
	}

	song, err := h.SongService.GetSongByID(c, songID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error fetching song: %s", err)})
		return
	}

	c.JSON(http.StatusOK, song)
}

// ListSongs handles listing all songs for the authenticated user
func (h *SongHandler) ListSongs(c *gin.Context) {
	// Retrieve user ID from context (set by AttachUserFromClerk middleware)
	userID := c.GetString("user_id")  // Assuming "user_id" is stored in the context

	songs, err := h.SongService.ListSongs(c, userID)  // Pass userID to the service
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error listing songs: %s", err)})
		return
	}

	c.JSON(http.StatusOK, songs)
}

