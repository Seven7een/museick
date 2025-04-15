package handlers

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
)

// SpotifyHandler contains methods for handling Spotify-related requests
type SpotifyHandler struct {
	SpotifyService *services.SpotifyService
}

// NewSpotifyHandler creates a new instance of SpotifyHandler
func NewSpotifyHandler(s *services.SpotifyService) *SpotifyHandler {
	return &SpotifyHandler{
		SpotifyService: s,
	}
}

// ExchangeCodeForToken handles the exchange of authorization code for token
func (h *SpotifyHandler) ExchangeCodeForToken(c *gin.Context) {
	var request struct {
		Code        string `json:"code"`
		CodeVerifier string `json:"code_verifier"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	tokenData, err := h.SpotifyService.ExchangeCodeForToken(request.Code, request.CodeVerifier)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Error exchanging token: %s", err)})
		return
	}

	c.JSON(200, tokenData)
}

// RefreshAccessToken handles the refreshing of the access token
func (h *SpotifyHandler) RefreshAccessToken(c *gin.Context) {
	var request struct {
		RefreshToken string `json:"refresh_token"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	tokenData, err := h.SpotifyService.RefreshAccessToken(request.RefreshToken)
	if err != nil {
		c.JSON(500, gin.H{"error": fmt.Sprintf("Error refreshing token: %s", err)})
		return
	}

	c.JSON(200, tokenData)
}
