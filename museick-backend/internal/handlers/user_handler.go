package handlers

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/middleware" // For ClerkUserIDKey
)

// UserHandler handles HTTP requests related to users.
type UserHandler struct {
	userService services.UserService
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(userService services.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// SyncUser handles the POST /api/users/sync request.
// It retrieves the user ID (sub) from the context (set by middleware)
// and calls the user service to ensure the user exists in the database.
func (h *UserHandler) SyncUser(c *gin.Context) {
	// Retrieve user ID (sub) from context set by AuthenticateClerkJWT middleware
	userIDValue, exists := c.Get(middleware.ClerkUserIDKey)
	if !exists {
		log.Println("Error in SyncUser handler: Clerk User ID not found in context.")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User identifier missing"})
		return
	}

	userID, ok := userIDValue.(string)
	if !ok || userID == "" {
		log.Println("Error in SyncUser handler: Invalid Clerk User ID type or empty in context.")
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid user identifier"})
		return
	}

	// Call the service layer to perform the sync logic
	err := h.userService.SyncUser(c.Request.Context(), userID)
	if err != nil {
		// Log the service error
		log.Printf("Error syncing user with sub '%s': %v\n", userID, err)
		// Return a generic server error to the client
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to synchronize user data"})
		return
	}

	// Sync successful (user exists or was created)
	// Return 204 No Content as there's nothing specific to return in the body
	c.Status(http.StatusNoContent)
}

// --- Add other user handlers (CreateUser, GetUser) here if needed ---
// Example:
// func (h *UserHandler) CreateUser(c *gin.Context) { ... }
// func (h *UserHandler) GetUser(c *gin.Context) { ... }
