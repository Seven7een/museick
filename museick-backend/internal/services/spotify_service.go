package services

import (
	"encoding/json"
	"fmt"
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

	req, err := http.NewRequest("POST", tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to exchange code for token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// TODO: Log the response body for better debugging
		return nil, fmt.Errorf("failed to exchange code for token, status: %d", resp.StatusCode)
	}

	var tokenData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tokenData); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

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
	encodedAuth := "Basic " + strings.TrimRight(fmt.Sprintf("%s", []byte(auth)), "=") // Basic Auth encoding
	req.Header.Set("Authorization", encodedAuth)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to refresh token: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		// TODO: Log the response body for better debugging
		return nil, fmt.Errorf("failed to refresh token, status: %d", resp.StatusCode)
	}

	var tokenData map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&tokenData); err != nil {
		return nil, fmt.Errorf("failed to decode refresh response: %w", err)
	}

	// Note: The refresh response might not include a new refresh_token.
	// If it does, you should securely store the new one.
	// If it doesn't, the original refresh_token remains valid.
	return tokenData, nil
}
