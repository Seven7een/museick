package models

// User represents a user entity.
type User struct {
	Sub      string `json:"sub" bson:"sub"` // Unique identifier from Clerk
	Username string `json:"username" bson:"username"`
}
