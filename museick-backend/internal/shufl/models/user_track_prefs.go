package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserTrackPrefs struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID       string             `bson:"user_id" json:"user_id"`
	SpotifyID    string             `bson:"spotify_id" json:"spotify_id"`
	Tags         []string           `bson:"tags,omitempty" json:"tags,omitempty"`
	SnoozedUntil *time.Time         `bson:"snoozed_until,omitempty" json:"snoozed_until,omitempty"`
	LastPlayed   *time.Time         `bson:"last_played,omitempty" json:"last_played,omitempty"`
	Weight       float64            `bson:"weight" json:"weight"`
	UpdatedAt    time.Time          `bson:"updated_at" json:"updated_at"`
}
