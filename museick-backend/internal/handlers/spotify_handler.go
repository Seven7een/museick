package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/middleware"
)

// SpotifyHandler contains methods for handling Spotify-related requests
type SpotifyHandler struct {
	SpotifyService *services.SpotifyService
	UserDAO        dao.UserDAO
}

// NewSpotifyHandler creates a new instance of SpotifyHandler
func NewSpotifyHandler(s *services.SpotifyService, u dao.UserDAO) *SpotifyHandler {
	return &SpotifyHandler{
		SpotifyService: s,
		UserDAO:        u,
	}
}

// ExchangeCodeForToken handles the exchange of authorization code for token
// This endpoint MUST be protected by authentication middleware
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

	// Log the incoming request details
	log.Printf("Received /exchange-code request: Code=%s, Verifier=%s", request.Code, request.CodeVerifier)

	// Get user sub from context (set by auth middleware)
	userSub, exists := c.Get(middleware.ClerkUserIDKey)
	if !exists {
		log.Println("Error: %s not found in context for /exchange-code", middleware.ClerkUserIDKey)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identifier not found in token"})
		return
	}
	subString, ok := userSub.(string)
	if !ok || subString == "" {
		log.Println("Error: %s in context is not a valid string for /exchange-code", middleware.ClerkUserIDKey)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identifier in token"})
		return
	}

	// TODO: Add rate limiting if necessary

	tokenData, err := h.SpotifyService.ExchangeCodeForToken(request.Code, request.CodeVerifier)
	if err != nil {
		// Log the internal error for debugging
		log.Printf("Error exchanging Spotify code for user %s: %v", subString, err)
		// Return a generic error to the client
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange Spotify token"})
		return
	}

	// Extract refresh token and store it
	refreshToken, ok := tokenData["refresh_token"].(string)
	if !ok || refreshToken == "" {
		// Log error but potentially continue if only access token is needed immediately
		log.Printf("Warning: No refresh token received from Spotify for user %s", subString)
		// Decide if this is a hard error or just a warning
		// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to obtain Spotify refresh token"})
		// return
	} else {
		// Store the refresh token
		err = h.UserDAO.UpdateRefreshToken(c.Request.Context(), subString, refreshToken)
		if err != nil {
			// Log error but don't necessarily fail the request, as access token might still be valid
			log.Printf("Error storing refresh token for user %s: %v", subString, err)
			// Optionally return an error to the client if storing is critical
			// c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to store Spotify refresh token"})
			// return
		} else {
			log.Printf("Successfully stored refresh token for user %s", subString)
		}
	}

	// Prepare response for the frontend (WITHOUT refresh token)
	frontendResponse := map[string]interface{}{
		"access_token": tokenData["access_token"],
		"expires_in":   tokenData["expires_in"],
		"scope":        tokenData["scope"],
		"token_type":   tokenData["token_type"],
	}

	c.JSON(http.StatusOK, frontendResponse)
}

// RefreshAccessToken handles the refreshing of the access token using the stored refresh token
// POST /api/spotify/refresh-token
// This endpoint MUST be protected by authentication middleware
func (h *SpotifyHandler) RefreshAccessToken(c *gin.Context) {
	// Get user sub from context (set by auth middleware)
	userSub, exists := c.Get(middleware.ClerkUserIDKey)
	if !exists {
		log.Println("Error: %s not found in context for /refresh-token", middleware.ClerkUserIDKey)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identifier not found in token"})
		return
	}
	subString, ok := userSub.(string)
	if !ok || subString == "" {
		log.Println("Error: %s in context is not a valid string for /refresh-token", middleware.ClerkUserIDKey)
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid user identifier in token"})
		return
	}

	// Retrieve the user's stored refresh token
	user, err := h.UserDAO.FindBySub(c.Request.Context(), subString)
	if err != nil {
		log.Printf("Error finding user %s for refresh token: %v", subString, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve user data"})
		return
	}
	if user == nil || user.SpotifyRefreshToken == "" {
		log.Printf("No refresh token found for user %s", subString)
		c.JSON(http.StatusBadRequest, gin.H{"error": "No Spotify refresh token available for this user. Please reconnect Spotify."})
		return
	}

	log.Printf("Attempting to refresh token for user %s", subString)
	// Use the stored refresh token
	tokenData, err := h.SpotifyService.RefreshAccessToken(user.SpotifyRefreshToken)
	if err != nil {
		// Log the internal error
		log.Printf("Error refreshing Spotify token for user %s: %v", subString, err)
		// Consider specific handling for Spotify errors (e.g., invalid refresh token)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to refresh Spotify token"})
		return
	}

	// Check if Spotify returned a *new* refresh token (it sometimes does)
	newRefreshToken, ok := tokenData["refresh_token"].(string)
	if ok && newRefreshToken != "" && newRefreshToken != user.SpotifyRefreshToken {
		log.Printf("Received new refresh token for user %s. Updating storage.", subString)
		err = h.UserDAO.UpdateRefreshToken(c.Request.Context(), subString, newRefreshToken)
		if err != nil {
			// Log error but proceed with sending the access token
			log.Printf("Error updating new refresh token for user %s: %v", subString, err)
		}
	}

	// Prepare response for the frontend (WITHOUT refresh token)
	frontendResponse := map[string]interface{}{
		"access_token": tokenData["access_token"],
		"expires_in":   tokenData["expires_in"],
		// Scope might not be included in refresh response, handle potential nil
		"scope":      tokenData["scope"],
		"token_type": tokenData["token_type"],
	}

	c.JSON(http.StatusOK, frontendResponse)
}
