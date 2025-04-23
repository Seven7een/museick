package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
	shuflServices "github.com/seven7een/museick/museick-backend/internal/shufl/services"
)

type PlayerHandler struct {
	spotifyService *services.SpotifyService
	playerService  *shuflServices.PlayerService
}

func NewPlayerHandler(spotifyService *services.SpotifyService, playerService *shuflServices.PlayerService) *PlayerHandler {
	return &PlayerHandler{
		spotifyService: spotifyService,
		playerService:  playerService,
	}
}

// GetCurrentlyPlaying returns the currently playing track
func (h *PlayerHandler) GetCurrentlyPlaying(c *gin.Context) {
	spotifyToken := c.GetHeader("X-Spotify-Token")
	if spotifyToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Spotify token required"})
		return
	}

	result, err := h.playerService.GetPlayerState(c, spotifyToken)
	if err != nil {
		log.Printf("Error getting current track: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetPlaylists returns the user's playlists with genre information
func (h *PlayerHandler) GetPlaylists(c *gin.Context) {
	spotifyToken := c.GetHeader("X-Spotify-Token")
	if spotifyToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Spotify token required"})
		return
	}

	playlists, err := h.playerService.GetUserPlaylists(c, spotifyToken)
	if err != nil {
		log.Printf("Error getting playlists: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"playlists": playlists,
	})
}

// GetQueue retrieves the current Spotify queue
func (h *PlayerHandler) GetQueue(c *gin.Context) {
	spotifyToken := c.GetHeader("X-Spotify-Token")
	if spotifyToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Spotify token required"})
		return
	}

	result, err := h.spotifyService.GetQueue(spotifyToken)
	if err != nil {
		log.Printf("Error getting queue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// AddToQueue adds a track to the Spotify queue
func (h *PlayerHandler) AddToQueue(c *gin.Context) {
	spotifyToken := c.GetHeader("X-Spotify-Token")
	if spotifyToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Spotify token required"})
		return
	}

	var req struct {
		URI string `json:"uri" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "URI is required"})
		return
	}

	if err := h.spotifyService.AddToQueue(spotifyToken, req.URI); err != nil {
		log.Printf("Error adding to queue: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Added to queue: %s", req.URI)
	c.JSON(http.StatusOK, gin.H{"message": "Added to queue"})
}

// ControlPlayback handles play/pause/next/previous actions
func (h *PlayerHandler) ControlPlayback(c *gin.Context) {
	action := c.Param("action")
	spotifyToken := c.GetHeader("X-Spotify-Token")

	if spotifyToken == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Spotify token required"})
		return
	}

	if err := h.playerService.ControlPlayback(c, spotifyToken, action); err != nil {
		log.Printf("Error controlling playback: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Playback control action: %s", action)
	c.JSON(http.StatusOK, gin.H{"message": "Playback control successful"})
}
