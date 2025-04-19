package models

// User represents a user entity stored in the database.
type User struct {
	// ID       primitive.ObjectID `bson:"_id,omitempty" json:"id"` // Optional: Use MongoDB's default ID
	Sub                 string `json:"sub" bson:"sub"`                                     // Unique identifier from Clerk (Primary Key)
	Username            string `json:"username,omitempty" bson:"username,omitempty"`       // Optional: Store username if needed
	SpotifyRefreshToken string `json:"-" bson:"spotify_refresh_token,omitempty"` // Store Spotify refresh token securely (omitempty so it's not added if empty)
	// TODO: Add fields like Email, CreatedAt, LastLoginAt if required
	// Email     string             `json:"email,omitempty" bson:"email,omitempty"`
	// CreatedAt primitive.DateTime `bson:"created_at" json:"created_at"`
	// LastLoginAt primitive.DateTime `bson:"last_login_at" json:"last_login_at"`
}
