package services

import (
	"context"
	"fmt"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
)

type UserService struct {
	userDAO *dao.UserDAO
}

func NewUserService(userDAO *dao.UserDAO) *UserService {
	return &UserService{userDAO}
}

// CreateUser ensures that a user is created if they don't exist already
func (s *UserService) CreateUser(ctx context.Context, sub string, username string) (*models.User, error) {
	user, err := s.userDAO.GetUserBySub(ctx, sub)
	if err != nil {
		return nil, fmt.Errorf("error checking user existence: %v", err)
	}
	if user != nil {
		return user, nil // User already exists
	}

	// If the user doesn't exist, create a new one
	newUser := &models.User{
		Sub:      sub,
		Username: username,
	}

	if err := s.userDAO.InsertUser(ctx, newUser); err != nil {
		return nil, fmt.Errorf("error creating new user: %v", err)
	}

	return newUser, nil
}


// GetUser retrieves a user by their unique Sub identifier
func (s *UserService) GetUserBySub(ctx context.Context, sub string) (*models.User, error) {
	user, err := s.userDAO.GetUserBySub(ctx, sub)
	if err != nil {
		return nil, fmt.Errorf("error retrieving user: %v", err)
	}

	if user == nil {
		return nil, fmt.Errorf("user not found")
	}

	return user, nil
}
