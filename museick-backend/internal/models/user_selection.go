package models

import "go.mongodb.org/mongo-driver/bson/primitive"

// SelectionRole defines the specific role of a user selection for a given month.
type SelectionRole string

const (
	// RoleMuseCandidate represents an item shortlisted as a potential Muse.
	RoleMuseCandidate SelectionRole = "muse_candidate"
	// RoleIckCandidate represents an item shortlisted as a potential Ick.
	RoleIckCandidate SelectionRole = "ick_candidate"
	// RoleMuseSelected represents the final chosen Muse for the month.
	RoleMuseSelected SelectionRole = "muse_selected"
	// RoleIckSelected represents the final chosen Ick for the month.
	RoleIckSelected SelectionRole = "ick_selected"
)

// SpotifyItemType defines the type of Spotify item selected.
type SpotifyItemType string

const (
	SpotifyItemTypeSong   SpotifyItemType = "song" // Renamed from track
	SpotifyItemTypeAlbum  SpotifyItemType = "album"
	SpotifyItemTypeArtist SpotifyItemType = "artist"
)

// UserSelection represents a user's interaction with a Spotify item for a specific month.
type UserSelection struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID        string             `bson:"user_id" json:"user_id"`                 // Clerk User ID (sub)
	SpotifyID     string             `bson:"spotify_id" json:"spotify_id"`           // ID of the Song/Album/Artist
	SpotifyType   SpotifyItemType    `bson:"spotify_type" json:"spotify_type"`       // "song", "album", or "artist"
	SelectionRole SelectionRole      `bson:"selection_role" json:"selection_role"`   // "muse_candidate", "ick_candidate", "muse_selected", "ick_selected"
	MonthYear     string             `bson:"month_year" json:"month_year"`           // Format: "YYYY-MM", e.g., "2024-07"
	AddedAt       primitive.DateTime `bson:"added_at" json:"added_at"`               // When the user first added this item for this role/month
	UpdatedAt     primitive.DateTime `bson:"updated_at" json:"updated_at"`           // When the selection was last modified
	Notes         string             `bson:"notes,omitempty" json:"notes,omitempty"` // Optional user notes
	// TODO: Add fields for tracking changes if needed (e.g., previous_selection_type, change_history)
}
