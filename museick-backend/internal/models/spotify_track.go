package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// SpotifyTrack represents the core data for a track fetched from Spotify.
// We use the Spotify ID as the primary key (_id) in MongoDB.
type SpotifyTrack struct {
	SpotifyID        string             `bson:"_id" json:"spotify_id"` // Use Spotify ID as the document ID
	Album            SimplifiedAlbum    `bson:"album" json:"album"`
	Artists          []SimplifiedArtist `bson:"artists" json:"artists"`
	AvailableMarkets []string           `bson:"available_markets" json:"available_markets"`
	DiscNumber       int                `bson:"disc_number" json:"disc_number"`
	DurationMs       int                `bson:"duration_ms" json:"duration_ms"`
	Explicit         bool               `bson:"explicit" json:"explicit"`
	ExternalIDs      map[string]string  `bson:"external_ids,omitempty" json:"external_ids,omitempty"`
	ExternalUrls     map[string]string  `bson:"external_urls" json:"external_urls"`
	Name             string             `bson:"name" json:"name"`
	Popularity       int                `bson:"popularity" json:"popularity"`
	PreviewURL       string             `bson:"preview_url,omitempty" json:"preview_url,omitempty"`
	TrackNumber      int                `bson:"track_number" json:"track_number"`
	Type             string             `bson:"type" json:"type"`
	URI              string             `bson:"uri" json:"uri"`
	IsLocal          bool               `bson:"is_local" json:"is_local"`
	LastFetchedAt    primitive.DateTime `bson:"last_fetched_at" json:"last_fetched_at"`
}
