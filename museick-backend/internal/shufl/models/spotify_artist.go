package models

type SpotifyArtist struct {
	ID        string   `json:"id"`
	SpotifyID string   `json:"spotify_id"`
	Name      string   `json:"name"`
	Genres    []string `json:"genres"`
}
