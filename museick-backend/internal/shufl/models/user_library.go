package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserLibrary struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID      string             `bson:"user_id" json:"user_id"`
	PlaylistIDs []string           `bson:"playlist_ids" json:"playlist_ids"`
	LastSynced  time.Time          `bson:"last_synced" json:"last_synced"`
	TrackCount  int                `bson:"track_count" json:"track_count"`
}
