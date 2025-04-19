package utils

import (
	"context"

	"github.com/zmb3/spotify/v2"
	"golang.org/x/oauth2"
)

// CreateTemporarySpotifyClient creates a new Spotify client using an access token
func CreateTemporarySpotifyClient(ctx context.Context, accessToken string) *spotify.Client {
	token := &oauth2.Token{AccessToken: accessToken, TokenType: "Bearer"}
	httpClient := oauth2.NewClient(ctx, oauth2.StaticTokenSource(token))
	return spotify.New(httpClient)
}
