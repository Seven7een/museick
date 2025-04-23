package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AudioFeatures struct {
	Danceability     float64 `bson:"danceability" json:"danceability"`
	Energy           float64 `bson:"energy" json:"energy"`
	Key              int     `bson:"key" json:"key"`
	Loudness         float64 `bson:"loudness" json:"loudness"`
	Mode             int     `bson:"mode" json:"mode"`
	Speechiness      float64 `bson:"speechiness" json:"speechiness"`
	Acousticness     float64 `bson:"acousticness" json:"acousticness"`
	Instrumentalness float64 `bson:"instrumentalness" json:"instrumentalness"`
	Liveness         float64 `bson:"liveness" json:"liveness"`
	Valence          float64 `bson:"valence" json:"valence"`
	Tempo            float64 `bson:"tempo" json:"tempo"`
	TimeSignature    int     `bson:"time_signature" json:"time_signature"`
}

type EnrichedTrack struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	SpotifyID  string             `bson:"spotify_id" json:"spotify_id"`
	Name       string             `bson:"name" json:"name"`
	Artists    []string           `bson:"artists" json:"artists"`
	Album      string             `bson:"album" json:"album"`
	AlbumID    string             `bson:"album_id" json:"album_id"`
	DurationMs int                `bson:"duration_ms" json:"duration_ms"`
	Popularity int                `bson:"popularity" json:"popularity"`
	PreviewURL string             `bson:"preview_url" json:"preview_url"`
	URI        string             `bson:"uri" json:"uri"`
	UserID     string             `bson:"user_id,omitempty"`

	// Enriched metadata (shared)
	AudioFeatures *AudioFeatures `bson:"audio_features" json:"audio_features"`
	Genres        []string       `bson:"genres" json:"genres"`
	LastUpdated   time.Time      `bson:"last_updated" json:"last_updated"`
}
