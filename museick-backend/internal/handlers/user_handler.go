package handlers

import (
	"fmt"
	"net/http"
	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/internal/models"
)

type UserHandler struct {
	UserService *services.UserService
}

func NewUserHandler(s *services.UserService) *UserHandler {
	return &UserHandler{
		UserService: s,
	}
}

// CreateUser handles user creation
func (h *UserHandler) CreateUser(c *gin.Context) {
	var newUser models.User
	if err := c.ShouldBindJSON(&newUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user data"})
		return
	}

	// Retrieve the user's `sub` (unique ID from Clerk)
	sub := c.GetString("sub")

	createdUser, err := h.UserService.CreateUser(c, sub, newUser.Username)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error creating user: %s", err)})
		return
	}

	c.JSON(http.StatusOK, createdUser)
}

// GetUser handles fetching a user by their `sub`
func (h *UserHandler) GetUser(c *gin.Context) {
	// Retrieve the `sub` from context
	sub := c.GetString("sub")
	if sub == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User `sub` is required"})
		return
	}

	user, err := h.UserService.GetUserBySub(c, sub)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": fmt.Sprintf("Error fetching user: %s", err)})
		return
	}

	c.JSON(http.StatusOK, user)
}
