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

// GetCurrentlyPlaying gets information about the user's currently playing track
func (s *SpotifyService) GetCurrentlyPlaying(accessToken string) (map[string]interface{}, error) {
	log.Println("Getting currently playing track...")
	result, err := s.MakeSpotifyAPIRequest("GET", "https://api.spotify.com/v1/me/player/currently-playing", accessToken, nil)
	if err != nil {
		log.Printf("Error getting currently playing: %v", err)
		return nil, err
	}
	log.Printf("Currently playing response: %+v", result)
	return result, nil
}

// GetQueue gets the user's player queue
func (s *SpotifyService) GetQueue(accessToken string) (map[string]interface{}, error) {
	log.Println("Getting player queue...")
	result, err := s.MakeSpotifyAPIRequest("GET", "https://api.spotify.com/v1/me/player/queue", accessToken, nil)
	if err != nil {
		log.Printf("Error getting queue: %v", err)
		return nil, err
	}
	log.Printf("Queue response: %+v", result)
	return result, nil
}

// AddToQueue adds a track to the user's player queue
func (s *SpotifyService) AddToQueue(accessToken string, uri string) error {
	log.Printf("Adding track to queue: %s", uri)
	url := fmt.Sprintf("https://api.spotify.com/v1/me/player/queue?uri=%s", url.QueryEscape(uri))
	_, err := s.MakeSpotifyAPIRequest("POST", url, accessToken, nil)
	if err != nil {
		log.Printf("Error adding to queue: %v", err)
		return err
	}
	log.Println("Successfully added to queue")
	return nil
}

// ControlPlayback handles play/pause/next/previous operations
func (s *SpotifyService) ControlPlayback(accessToken string, action string) error {
	var endpoint string
	switch action {
	case "play":
		endpoint = "https://api.spotify.com/v1/me/player/play"
	case "pause":
		endpoint = "https://api.spotify.com/v1/me/player/pause"
	case "next":
		endpoint = "https://api.spotify.com/v1/me/player/next"
	case "previous":
		endpoint = "https://api.spotify.com/v1/me/player/previous"
	default:
		return fmt.Errorf("invalid playback action: %s", action)
	}

	log.Printf("Controlling playback: %s", action)
	_, err := s.MakeSpotifyAPIRequest("PUT", endpoint, accessToken, nil)
	if err != nil {
		log.Printf("Error controlling playback: %v", err)
		return err
	}
	log.Printf("Successfully executed playback action: %s", action)
	return nil
}

// MakeSpotifyAPIRequest is a helper function for making Spotify API requests
// Now exported so it can be used by the shufl package
func (s *SpotifyService) MakeSpotifyAPIRequest(method, url, accessToken string, body io.Reader) (map[string]interface{}, error) {
	req, err := http.NewRequest(method, url, body)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+accessToken)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	// Read response body first for logging and reuse
	bodyBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	// Debug log the raw response
	log.Printf("Spotify API Response [%s %s] Status: %d, Body: %s", method, url, resp.StatusCode, string(bodyBytes))

	// Handle 204 No Content or empty responses
	if resp.StatusCode == 204 || len(bodyBytes) == 0 {
		return nil, nil
	}

	// For success responses (200-299), try to parse as JSON
	if resp.StatusCode >= 200 && resp.StatusCode < 300 {
		var result map[string]interface{}
		if err := json.Unmarshal(bodyBytes, &result); err != nil {
			// If we can't parse JSON but the status is success, just return nil
			log.Printf("Warning: Successful status but non-JSON response: %s", string(bodyBytes))
			return nil, nil
		}
		return result, nil
	}

	// For error responses, return the error message
	return nil, fmt.Errorf("request failed with status %d: %s", resp.StatusCode, string(bodyBytes))
}
