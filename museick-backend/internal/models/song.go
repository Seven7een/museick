package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// Song represents the song data that will be saved in the database
type Song struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID    string             `bson:"user_id" json:"user_id"`       // This links to the user who picked the song
	SpotifyID string             `bson:"spotify_id" json:"spotify_id"` // Spotify's unique ID for the track/artist/album
	Name      string             `bson:"name" json:"name"`
	Artists   []string           `bson:"artists" json:"artists"`                 // List of artist names
	AlbumName string             `bson:"album_name,omitempty" json:"album_name"` // Optional: Album name if it's a track
	// TODO: Add fields like ImageURL, ItemType (track/artist/album), etc.
	AddedAt   primitive.DateTime `bson:"added_at" json:"added_at"`     // When the record was created in *our* DB
	UpdatedAt primitive.DateTime `bson:"updated_at" json:"updated_at"` // When the record was last updated in *our* DB
}
