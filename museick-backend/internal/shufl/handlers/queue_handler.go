package handlers

import (
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/internal/shufl/dao"
	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
	"github.com/seven7een/museick/museick-backend/internal/shufl/services"
)

type QueueHandler struct {
	queueService  *services.QueueService
	playerService *services.PlayerService
	activeQueue   *services.ActiveQueueService
	userPrefsDAO  dao.UserTrackPrefsDAO
}

func NewQueueHandler(
	queueService *services.QueueService,
	playerService *services.PlayerService,
	activeQueue *services.ActiveQueueService,
	userPrefsDAO dao.UserTrackPrefsDAO,
) *QueueHandler {
	return &QueueHandler{
		queueService:  queueService,
		playerService: playerService,
		activeQueue:   activeQueue,
		userPrefsDAO:  userPrefsDAO,
	}
}

// StartNewSession starts a new shuffle session with given preferences
func (h *QueueHandler) StartNewSession(c *gin.Context) {
	var prefs models.ShufflePreferences
	if err := c.ShouldBindJSON(&prefs); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preferences format"})
		return
	}

	userID := c.GetString("user_id") // From auth middleware
	spotifyToken := c.GetHeader("X-Spotify-Token")

	// Clear existing queue if possible
	if err := h.playerService.ClearQueue(c, spotifyToken); err != nil {
		// Log but continue - not critical
		log.Printf("Warning: Could not clear queue: %v", err)
	}

	// Start new queue session
	if err := h.activeQueue.StartNewSession(c, userID, &prefs, spotifyToken); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "New shuffle session started",
	})
}

// GetQueue returns the current queue for the user
func (h *QueueHandler) GetQueue(c *gin.Context) {
	userID := c.GetString("user_id")
	spotifyToken := c.GetHeader("X-Spotify-Token")

	queue, err := h.activeQueue.GetCurrentQueue(c, userID, spotifyToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"queue": queue,
	})
}

// UpdateTrackPreference handles user feedback on tracks
func (h *QueueHandler) UpdateTrackPreference(c *gin.Context) {
	userID := c.GetString("user_id")
	trackID := c.Param("trackId")

	var req struct {
		Action string `json:"action" binding:"required,oneof=like dislike snooze"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid action"})
		return
	}

	var weight float64
	var snoozeDuration time.Duration

	switch req.Action {
	case "like":
		weight = 1.5 // Increase probability
	case "dislike":
		weight = 0.5 // Decrease probability
	case "snooze":
		weight = 1.0
		snoozeDuration = 24 * time.Hour // Snooze for 24 hours
	}

	// Update track preferences
	pref := &models.UserTrackPrefs{
		UserID:    userID,
		SpotifyID: trackID,
		Weight:    weight,
		UpdatedAt: time.Now(),
	}

	if snoozeDuration > 0 {
		snoozedUntil := time.Now().Add(snoozeDuration)
		pref.SnoozedUntil = &snoozedUntil
	}

	if err := h.userPrefsDAO.Upsert(c, pref); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": fmt.Sprintf("Track preference updated: %s", req.Action),
	})
}
