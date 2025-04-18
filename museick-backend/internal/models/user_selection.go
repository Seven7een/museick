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

// UserSelection represents a user's interaction with a Spotify item for a specific month.
type UserSelection struct {
	ID            primitive.ObjectID `bson:"_id,omitempty" json:"id"`
	UserID        string             `bson:"user_id" json:"user_id"`                 // Clerk User ID (sub)
	SpotifyItemID string             `bson:"spotify_item_id" json:"spotify_item_id"` // ID of the Track/Album/Artist
	ItemType      string             `bson:"item_type" json:"item_type"`             // "track", "album", or "artist"
	SelectionRole SelectionRole      `bson:"selection_role" json:"selection_role"`   // "muse_candidate", "ick_candidate", "muse_selected", "ick_selected"
	MonthYear     string             `bson:"month_year" json:"month_year"`           // Format: "YYYY-MM", e.g., "2024-07"
	AddedAt       primitive.DateTime `bson:"added_at" json:"added_at"`               // When the user first added this item for this role/month
	UpdatedAt     primitive.DateTime `bson:"updated_at" json:"updated_at"`           // When the selection was last modified
	Notes         string             `bson:"notes,omitempty" json:"notes,omitempty"` // Optional user notes
	// TODO: Add fields for tracking changes if needed (e.g., previous_selection_type, change_history)
}

// CreateSelectionRequest defines the expected JSON body for POST /api/selections
// This is used by the handler to bind the incoming request.
type CreateSelectionRequest struct {
	SpotifyItemID string        `json:"spotify_item_id" binding:"required"`
	ItemType      string        `json:"item_type" binding:"required"`      // "track", "album", or "artist"
	Role          SelectionRole `json:"selection_role" binding:"required"` // "muse_candidate" or "ick_candidate"
	MonthYear     string        `json:"month_year" binding:"required"`     // "YYYY-MM"
	Notes         string        `json:"notes"`                             // Optional
}
