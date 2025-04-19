package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/middleware"
)

type PlaylistHandler struct {
	playlistService *services.PlaylistService
}

func NewPlaylistHandler(playlistService *services.PlaylistService) *PlaylistHandler {
	return &PlaylistHandler{
		playlistService: playlistService,
	}
}

func (h *PlaylistHandler) CreatePlaylist(c *gin.Context) {
	var request struct {
		Year              int    `json:"year" binding:"required"`
		Mode              string `json:"mode" binding:"required,oneof=muse ick"`
		IncludeCandidates bool   `json:"include_candidates"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format"})
		return
	}

	userID := c.GetString(middleware.ClerkUserIDKey)
	spotifyToken := c.GetHeader("X-Spotify-Token")

	playlistURL, err := h.playlistService.CreateYearlyPlaylist(
		c.Request.Context(),
		userID,
		spotifyToken,
		request.Year,
		request.Mode,
		request.IncludeCandidates,
	)

	if err != nil {
		log.Printf("Error creating playlist: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create playlist"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Playlist created successfully",
		"url":     playlistURL,
	})
}
