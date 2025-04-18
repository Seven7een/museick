package handlers

import (
	"log"
	"net/http"

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
// POST /api/spotify/exchange-code
func (h *SpotifyHandler) ExchangeCodeForToken(c *gin.Context) {
	var request struct {
		Code         string `json:"code" binding:"required"`
		CodeVerifier string `json:"code_verifier" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// TODO: Add rate limiting if necessary

	tokenData, err := h.SpotifyService.ExchangeCodeForToken(request.Code, request.CodeVerifier)
	if err != nil {
		// Log the internal error for debugging
		log.Printf("Error exchanging Spotify code: %v", err)
		// Return a generic error to the client
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange Spotify token"})
		return
	}

	// TODO: Consider storing the refresh token securely associated with the user
	// The access token is typically stored client-side (e.g., sessionStorage)

	c.JSON(http.StatusOK, tokenData)
}

// RefreshAccessToken handles the refreshing of the access token
// POST /api/spotify/refresh-token
func (h *SpotifyHandler) RefreshAccessToken(c *gin.Context) {
	var request struct {
		RefreshToken string `json:"refresh_token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request: " + err.Error()})
		return
	}

	// TODO: Retrieve the refresh token securely (e.g., from DB associated with user)
	// The client should ideally not be sending the refresh token directly.
	// This endpoint might need redesign depending on security requirements.

	tokenData, err := h.SpotifyService.RefreshAccessToken(request.RefreshToken)
	if err != nil {
		// Log the internal error
		log.Printf("Error refreshing Spotify token: %v", err)
		// Return a generic error
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh Spotify token"})
		return
	}

	// The response typically contains a new access_token and its expiry.
	// It might sometimes contain a new refresh_token.
	c.JSON(http.StatusOK, tokenData)
}
