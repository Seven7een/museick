package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// SpotifyAlbum represents the core data for an album fetched from Spotify.
// We use the Spotify ID as the primary key (_id) in MongoDB.
type SpotifyAlbum struct {
	SpotifyID            string             `bson:"_id" json:"spotify_id"` // Use Spotify ID as the document ID
	AlbumType            string             `bson:"album_type" json:"album_type"`
	TotalTracks          int                `bson:"total_tracks" json:"total_tracks"`
	AvailableMarkets     []string           `bson:"available_markets" json:"available_markets"`
	ExternalUrls         map[string]string  `bson:"external_urls" json:"external_urls"`
	Href                 string             `bson:"href" json:"href"`
	Images               []ImageObject      `bson:"images" json:"images"`
	Name                 string             `bson:"name" json:"name"`
	ReleaseDate          string             `bson:"release_date" json:"release_date"`
	ReleaseDatePrecision string             `bson:"release_date_precision" json:"release_date_precision"`
	Restrictions         *Restrictions      `bson:"restrictions,omitempty" json:"restrictions,omitempty"`
	Type                 string             `bson:"type" json:"type"`
	URI                  string             `bson:"uri" json:"uri"`
	Artists              []SimplifiedArtist `bson:"artists" json:"artists"` // Simplified artist objects
	// TODO: Consider adding fields like Genres, Label, Copyrights if fetching full album object, but spotify GO api in use is very minimalistic
	// Internal fields
	LastFetchedAt primitive.DateTime `bson:"last_fetched_at" json:"last_fetched_at"` // Track when we last updated this from Spotify
}
