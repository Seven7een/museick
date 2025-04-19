package services

import (
	"encoding/base64" // Added for Basic Auth
	"encoding/json"
	"fmt"
	"io"  // Added for reading response body
	"log" // Added for logging
	"net/http"
	"net/url"
	"strings"

	"github.com/seven7een/museick/museick-backend/initializers"
)

type SpotifyService struct {
	ClientID     string
	ClientSecret string
}

func NewSpotifyService(clientID, clientSecret string) *SpotifyService {
	return &SpotifyService{
		ClientID:     clientID,
		ClientSecret: clientSecret,
	}
}

// ExchangeCodeForToken exchanges the authorization code for an access token and refresh token
func (s *SpotifyService) ExchangeCodeForToken(code, codeVerifier string) (map[string]interface{}, error) {
	tokenURL := "https://accounts.spotify.com/api/token"
	data := url.Values{}
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", initializers.GetConfig().SpotifyRedirectURL) // Should come from config
	data.Set("client_id", s.ClientID)
	data.Set("code_verifier", codeVerifier)

	// Log the request being sent to Spotify
	log.Printf("Sending token exchange request to Spotify: URL=%s, Body=%s", tokenURL, data.Encode())

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		log.Printf("Error creating Spotify request: %v", err)
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending request to Spotify: %v", err)
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}
	defer resp.Body.Close()

	// Read the raw response body first for logging
	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("Error reading Spotify response body: %v", readErr)
		// Still try to proceed if status was OK, but log the read error
	}
	rawBody := string(bodyBytes) // Keep raw body for logging

	if resp.StatusCode != http.StatusOK {
		log.Printf("Spotify token exchange failed: Status=%d, Body=%s", resp.StatusCode, rawBody)
		return nil, fmt.Errorf("failed to exchange code for token, status: %d", resp.StatusCode)
	}

	log.Printf("Spotify token exchange successful: Status=%d, RawBody=%s", resp.StatusCode, rawBody)

	var tokenData map[string]interface{}
	// Use the already read bodyBytes for decoding
	if err := json.Unmarshal(bodyBytes, &tokenData); err != nil {
		log.Printf("Error decoding Spotify response JSON: %v, RawBody: %s", err, rawBody)
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Log the decoded data before returning
	log.Printf("Decoded Spotify token data: %+v", tokenData)

	return tokenData, nil
}

// RefreshAccessToken refreshes the access token using the refresh token
func (s *SpotifyService) RefreshAccessToken(refreshToken string) (map[string]interface{}, error) {
	tokenURL := "https://accounts.spotify.com/api/token"
	data := url.Values{}
	data.Set("grant_type", "refresh_token")
	data.Set("refresh_token", refreshToken)
	data.Set("client_id", s.ClientID) // Client ID is needed for refresh

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create refresh request: %w", err)
	}

	// Spotify requires Basic Auth for token refresh
	auth := s.ClientID + ":" + s.ClientSecret
	// Correct Basic Auth encoding: use base64 encoding
	encodedAuth := "Basic " + base64.StdEncoding.EncodeToString([]byte(auth))
	req.Header.Set("Authorization", encodedAuth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	// Log the refresh request being sent
	log.Printf("Sending token refresh request to Spotify: URL=%s, Body=%s", tokenURL, data.Encode())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		log.Printf("Error sending refresh request to Spotify: %v", err)
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}
	defer resp.Body.Close()

	// Read the raw response body first for logging
	bodyBytes, readErr := io.ReadAll(resp.Body)
	if readErr != nil {
		log.Printf("Error reading Spotify refresh response body: %v", readErr)
	}
	rawBody := string(bodyBytes)

	if resp.StatusCode != http.StatusOK {
		log.Printf("Spotify token refresh failed: Status=%d, Body=%s", resp.StatusCode, rawBody)
		return nil, fmt.Errorf("failed to refresh token, status: %d", resp.StatusCode)
	}

	log.Printf("Spotify token refresh successful: Status=%d, RawBody=%s", resp.StatusCode, rawBody)

	var tokenData map[string]interface{}
	if err := json.Unmarshal(bodyBytes, &tokenData); err != nil {
		log.Printf("Error decoding Spotify refresh response JSON: %v, RawBody: %s", err, rawBody)
		return nil, fmt.Errorf("failed to decode refresh response: %w", err)
	}

	// Log the decoded data before returning
	log.Printf("Decoded Spotify refresh token data: %+v", tokenData)

	// Note: The refresh response might not include a new refresh_token.
	// If it does, we should securely store the new one.
	// If it doesn't, the original refresh_token remains valid.
	return tokenData, nil
}
