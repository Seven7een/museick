package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// SpotifyArtist represents the core data for an artist fetched from Spotify.
// We use the Spotify ID as the primary key (_id) in MongoDB.
type SpotifyArtist struct {
	SpotifyID    string            `bson:"_id" json:"spotify_id"` // Use Spotify ID as the document ID
	ExternalUrls map[string]string `bson:"external_urls" json:"external_urls"`
	// TODO: Add Followers field if fetching full artist object
	// Followers    *FollowersObject  `bson:"followers,omitempty" json:"followers,omitempty"`
	Genres        []string           `bson:"genres,omitempty" json:"genres,omitempty"` // Often requires fetching full artist
	Href          string             `bson:"href" json:"href"`
	Images        []ImageObject      `bson:"images,omitempty" json:"images,omitempty"` // Often requires fetching full artist
	Name          string             `bson:"name" json:"name"`
	Popularity    *int               `bson:"popularity,omitempty" json:"popularity,omitempty"` // Often requires fetching full artist
	Type          string             `bson:"type" json:"type"`                                 // "artist"
	URI           string             `bson:"uri" json:"uri"`
	LastFetchedAt primitive.DateTime `bson:"last_fetched_at" json:"last_fetched_at"` // Track when we last updated this from Spotify
}

// TODO: Define FollowersObject if needed
// type FollowersObject struct {
// 	Href  *string `bson:"href" json:"href"` // Can be null
// 	Total int     `bson:"total" json:"total"`
// }
