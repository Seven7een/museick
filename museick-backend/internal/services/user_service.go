package services

import (
	"context"
	"errors" // Import errors package
	"log"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/mongo" // Import mongo package
)

// UserService defines the interface for user-related business logic.
type UserService interface {
	SyncUser(ctx context.Context, sub string) error
	// Add other methods like GetUserByID etc.
}

// userServiceImpl implements the UserService interface.
type userServiceImpl struct {
	userDAO dao.UserDAO
}

// NewUserService creates a new instance of UserService.
func NewUserService(userDAO dao.UserDAO) UserService {
	return &userServiceImpl{userDAO: userDAO}
}

// SyncUser finds a user by Clerk subject ID (sub) and creates them if they don't exist.
func (s *userServiceImpl) SyncUser(ctx context.Context, sub string) error {
	if sub == "" {
		return errors.New("user subject ID (sub) cannot be empty")
	}

	// 1. Check if user exists
	existingUser, err := s.userDAO.FindBySub(ctx, sub)

	// 2. Handle different scenarios
	if err == nil && existingUser != nil {
		// User already exists - Sync successful (or update last login etc.)
		// log.Printf("User with sub '%s' already exists. Sync successful.\n", sub)
		// Optionally: Update last login timestamp here if needed
		return nil
	} else if errors.Is(err, mongo.ErrNoDocuments) {
		// User does not exist - Create new user
		log.Printf("User with sub '%s' not found. Creating new user.\n", sub)
		newUser := &models.User{
			Sub: sub,
			// TODO: Optionally fetch username/email from Clerk claims if available
			// You would need to pass claims from middleware -> handler -> service
			// Username: claims.Username,
		}
		createErr := s.userDAO.Create(ctx, newUser)
		if createErr != nil {
			// Log the specific creation error
			log.Printf("Failed to create user during sync for sub '%s': %v\n", sub, createErr)
			return createErr // Return the creation error
		}
		return nil // Creation successful
	} else if err != nil {
		// Other database error during FindBySub
		log.Printf("Database error during user sync check for sub '%s': %v\n", sub, err)
		return err // Return the database error
	} else {
		// Should not happen (err is nil but existingUser is nil)
		log.Printf("Unexpected state during user sync check for sub '%s'.\n", sub)
		return errors.New("unexpected error during user sync")
	}
}