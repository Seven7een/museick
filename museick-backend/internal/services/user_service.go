package services

import (
	"context"
	"errors"
	"log"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserService defines the interface for user-related business logic.
type UserService interface {
	SyncUser(ctx context.Context, sub string) error
	// TODO: Add other methods like GetUserByID etc.
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

	existingUser, err := s.userDAO.FindBySub(ctx, sub)

	if err == nil && existingUser != nil {
		// User already exists - Sync successful (or update last login etc.)
		// log.Printf("User with sub '%s' already exists. Sync successful.\n", sub)
		// TODO: Optionally: Update last login timestamp here if needed
		return nil
	} else if errors.Is(err, mongo.ErrNoDocuments) {
		// User does not exist - Create new user
		log.Printf("User with sub '%s' not found. Creating new user.\n", sub)
		newUser := &models.User{
			Sub: sub,
			// Add default values if needed
			// Username: "DefaultUsername", // Example
		}

		createErr := s.userDAO.Create(ctx, newUser)
		if createErr != nil {
			log.Printf("Error creating user during sync for sub '%s': %v\n", sub, createErr)
			return createErr // Return the creation error
		}
		return nil // User created successfully
	} else {
		// Handle other potential errors from FindBySub
		log.Printf("Error checking user existence for sub '%s': %v\n", sub, err)
		return err
	}
	// This part should ideally not be reached if logic above is correct
	// log.Printf("Unexpected state during user sync check for sub '%s'.\n", sub)
	// return errors.New("unexpected error during user sync")
}
