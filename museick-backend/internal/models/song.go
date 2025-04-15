package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// Song represents the song data that will be saved in the database
type Song struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      string             `bson:"user_id" json:"user_id"` // This links to the user who picked the song
	SpotifyID   string             `bson:"spotify_id" json:"spotify_id"`
	Name        string             `bson:"name" json:"name"`
	Artists     []string           `bson:"artists" json:"artists"`
	AlbumName   string             `bson:"album_name" json:"album_name"`
	AddedAt     primitive.DateTime `bson:"added_at" json:"added_at"`
	UpdatedAt   primitive.DateTime `bson:"updated_at" json:"updated_at"`
}
