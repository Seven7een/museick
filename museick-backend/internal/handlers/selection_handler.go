package handlers

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/middleware"
	"go.mongodb.org/mongo-driver/mongo"
)

// SelectionHandler handles HTTP requests related to user selections.
type SelectionHandler struct {
	selectionService *services.UserSelectionService
}

// NewSelectionHandler creates a new SelectionHandler.
func NewSelectionHandler(svc *services.UserSelectionService) *SelectionHandler {
	return &SelectionHandler{selectionService: svc}
}

// CreateSelection handles POST /api/selections
// @Summary Add a selection candidate
// @Description Adds a Spotify item (song, album, artist) to the user's candidate list (Muse or Ick) for a specific month.
// @Tags selections
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param selection body models.CreateSelectionRequest true "Candidate Selection Data" // Specify package
// @Success 201 {object} models.UserSelection "Selection candidate created successfully"
// @Success 200 {object} models.UserSelection "Selection already existed"
// @Failure 400 {object} gin.H "Invalid input format or data"
// @Failure 401 {object} gin.H "Unauthorized"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/selections [post]
// @Security BearerAuth
func (h *SelectionHandler) CreateSelection(c *gin.Context) {
	var request models.CreateSelectionRequest // Use models.CreateSelectionRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request format: " + err.Error()})
		return
	}

	// Get user ID from context (set by auth middleware)
	userID := c.GetString(middleware.ClerkUserIDKey)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User ID not found in context"})
		return
	}

	// Get Spotify access token from header
	spotifyToken := c.GetHeader("X-Spotify-Token")
	if spotifyToken == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Spotify token is required"})
		return
	}

	selection, err := h.selectionService.CreateSelection(c.Request.Context(), userID, spotifyToken, &request)
	if err != nil {
		if err.Error() == "spotify item not found" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to verify Spotify item. Please ensure your account is linked and try again."})
			return
		}
		if strings.Contains(err.Error(), "spotify client not configured") || strings.Contains(err.Error(), "user tokens not found") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Failed to authenticate with Spotify. Please ensure your account is linked."})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create selection: " + err.Error()})
		return
	}

	c.JSON(http.StatusCreated, selection)
}

// ListSelectionsByMonth handles GET /api/selections/:monthYear
// @Summary List selections by month
// @Description Retrieves all selections (candidates and selected) for the authenticated user for a specific month.
// @Tags selections
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param monthYear path string true "Month and Year (YYYY-MM)" Format(YYYY-MM) Example(2024-07)
// @Success 200 {array} models.UserSelection "List of selections"
// @Failure 400 {object} gin.H "Invalid monthYear format"
// @Failure 401 {object} gin.H "Unauthorized"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/selections/{monthYear} [get]
// @Security BearerAuth
func (h *SelectionHandler) ListSelectionsByMonth(c *gin.Context) {
	userID := c.GetString(middleware.ClerkUserIDKey)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identifier missing"})
		return
	}

	monthYear := c.Param("monthYear") // Get from URL path

	selections, err := h.selectionService.ListSelectionsByMonth(c.Request.Context(), userID, monthYear)
	if err != nil {
		if strings.Contains(err.Error(), "invalid MonthYear format") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		log.Printf("Error listing selections for user %s, month %s: %v", userID, monthYear, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to retrieve selections"})
		return
	}

	// Return empty array if no selections found (service layer ensures this)
	c.JSON(http.StatusOK, selections)
}

// UpdateSelectionRequest defines the expected JSON body for PUT /api/selections/:id
type UpdateSelectionRequest struct {
	Role  *models.SelectionRole `json:"selection_role"` // Pointer to distinguish between not provided and empty string
	Notes *string               `json:"notes"`          // Pointer
}

// UpdateSelection handles PUT /api/selections/:id
// @Summary Update a selection's role or notes
// @Description Updates the role (e.g., candidate to selected) or notes of a specific selection. Handles demotion of previous selection if needed.
// @Tags selections
// @Accept json
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Selection ID (MongoDB ObjectID)"
// @Param selection body UpdateSelectionRequest true "Fields to update (selection_role and/or notes)"
// @Success 200 {object} models.UserSelection "Selection updated successfully"
// @Failure 400 {object} gin.H "Invalid input format, data, or ID"
// @Failure 401 {object} gin.H "Unauthorized"
// @Failure 403 {object} gin.H "Forbidden (selection does not belong to user)"
// @Failure 404 {object} gin.H "Selection not found"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/selections/{id} [put]
// @Security BearerAuth
func (h *SelectionHandler) UpdateSelection(c *gin.Context) {
	userID := c.GetString(middleware.ClerkUserIDKey)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identifier missing"})
		return
	}

	selectionID := c.Param("id") // Get selection's MongoDB ID from URL path

	var req UpdateSelectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		log.Printf("Error binding JSON for UpdateSelection: %v", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("Invalid request body: %s", err.Error())})
		return
	}

	// Validate role if provided
	var validatedRole *models.SelectionRole
	if req.Role != nil {
		role := models.SelectionRole(strings.ToLower(string(*req.Role)))
		if role != models.RoleMuseCandidate && role != models.RoleIckCandidate &&
			role != models.RoleMuseSelected && role != models.RoleIckSelected {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid selection_role. Must be 'muse_candidate', 'ick_candidate', 'muse_selected', or 'ick_selected'."})
			return
		}
		validatedRole = &role // Use the validated role
	}

	input := services.UpdateSelectionInput{
		SelectionID: selectionID,
		UserID:      userID,        // Pass UserID for authorization check in service
		Role:        validatedRole, // Pass validated role pointer
		Notes:       req.Notes,
	}

	updatedSelection, err := h.selectionService.UpdateSelection(c.Request.Context(), input)
	if err != nil {
		// Use errors.Is for specific error types
		if errors.Is(err, mongo.ErrNoDocuments) || strings.Contains(err.Error(), "selection not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Selection not found"})
			return
		}
		// Check for auth error string from service
		if strings.Contains(err.Error(), "authorization failed") || strings.Contains(err.Error(), "unauthorized") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		// Check for bad request errors
		if strings.Contains(err.Error(), "invalid selection ID format") || strings.Contains(err.Error(), "no updates provided") || strings.Contains(err.Error(), "invalid target selection role") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		log.Printf("Error updating selection ID %s for user %s: %v", selectionID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update selection"})
		return
	}

	c.JSON(http.StatusOK, updatedSelection)
}

// DeleteSelection handles DELETE /api/selections/:id
// @Summary Delete a selection
// @Description Deletes a specific user selection (candidate or selected).
// @Tags selections
// @Produce json
// @Param Authorization header string true "Bearer token"
// @Param id path string true "Selection ID (MongoDB ObjectID)"
// @Success 204 "Selection deleted successfully"
// @Failure 400 {object} gin.H "Invalid ID format"
// @Failure 401 {object} gin.H "Unauthorized"
// @Failure 403 {object} gin.H "Forbidden (selection does not belong to user)"
// @Failure 404 {object} gin.H "Selection not found"
// @Failure 500 {object} gin.H "Internal server error"
// @Router /api/selections/{id} [delete]
// @Security BearerAuth
func (h *SelectionHandler) DeleteSelection(c *gin.Context) {
	userID := c.GetString(middleware.ClerkUserIDKey)
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User identifier missing"})
		return
	}

	selectionID := c.Param("id") // Get selection's MongoDB ID from URL path

	err := h.selectionService.DeleteSelection(c.Request.Context(), selectionID, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) || strings.Contains(err.Error(), "selection not found") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Selection not found"})
			return
		}
		if strings.Contains(err.Error(), "invalid selection ID format") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// Check for auth error string from service
		if strings.Contains(err.Error(), "unauthorized") {
			c.JSON(http.StatusForbidden, gin.H{"error": "Forbidden"})
			return
		}
		log.Printf("Error deleting selection ID %s for user %s: %v", selectionID, userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete selection"})
		return
	}

	c.Status(http.StatusNoContent) // Success, no body
}
