package services

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/internal/shufl/dao"
	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
	"github.com/seven7een/museick/museick-backend/pkg/utils"
)

type ActiveQueue struct {
	UserID    string
	Tracks    []string
	Index     int
	Prefs     *models.ShufflePreferences
	CreatedAt time.Time
}

type ActiveQueueService struct {
	mu               sync.RWMutex
	activeQueues     map[string]*ActiveQueue // userID -> Queue
	queueService     *QueueService
	playerService    *PlayerService
	spotifyService   *services.SpotifyService
	enrichedTrackDAO dao.EnrichedTrackDAO
}

func NewActiveQueueService(
	queueService *QueueService,
	playerService *PlayerService,
	spotifyService *services.SpotifyService,
	enrichedTrackDAO dao.EnrichedTrackDAO,
) *ActiveQueueService {
	service := &ActiveQueueService{
		activeQueues:     make(map[string]*ActiveQueue),
		queueService:     queueService,
		playerService:    playerService,
		spotifyService:   spotifyService,
		enrichedTrackDAO: enrichedTrackDAO,
	}

	// Start queue monitor
	go service.monitorQueues()
	return service
}

func (s *ActiveQueueService) StartNewSession(ctx context.Context, userID string, prefs *models.ShufflePreferences, accessToken string) error {
	// Generate initial queue
	tracks, err := s.queueService.GenerateQueue(ctx, userID, prefs)
	if err != nil {
		return fmt.Errorf("failed to generate queue: %w", err)
	}

	if len(tracks) == 0 {
		return fmt.Errorf("no tracks available matching preferences")
	}

	// Create new active queue
	queue := &ActiveQueue{
		UserID:    userID,
		Tracks:    tracks,
		Index:     0,
		Prefs:     prefs,
		CreatedAt: time.Now(),
	}

	// Store in active queues
	s.mu.Lock()
	s.activeQueues[userID] = queue
	s.mu.Unlock()

	// Add initial tracks to Spotify queue
	for i := 0; i < utils.Min(5, len(tracks)); i++ {
		if err := s.spotifyService.AddToQueue(accessToken, "spotify:track:"+tracks[i]); err != nil {
			log.Printf("Warning: Failed to add track to queue: %v", err)
		}
	}

	return nil
}

func (s *ActiveQueueService) monitorQueues() {
	ticker := time.NewTicker(10 * time.Second)
	for range ticker.C {
		s.mu.RLock()
		for userID, queue := range s.activeQueues {
			go s.checkAndUpdateQueue(userID, queue)
		}
		s.mu.RUnlock()
	}
}

func (s *ActiveQueueService) checkAndUpdateQueue(userID string, queue *ActiveQueue) {
	// Get spotify token from context/cache/etc
	accessToken := "" // TODO: Get from auth service
	if accessToken == "" {
		return
	}

	// Get current playback state
	state, err := s.spotifyService.GetCurrentlyPlaying(accessToken)
	if err != nil {
		log.Printf("Error checking player state for user %s: %v", userID, err)
		return
	}

	// Get queue state
	queueState, err := s.spotifyService.GetQueue(accessToken)
	if err != nil {
		log.Printf("Error checking queue for user %s: %v", userID, err)
		return
	}

	queueLength := 0
	if queue, ok := queueState["queue"].([]interface{}); ok {
		queueLength = len(queue)
	}

	// If queue is getting low and track is near end, add more tracks
	if s.shouldAddMoreTracks(state, queueLength) {
		s.mu.Lock()
		currentIndex := queue.Index
		tracksToAdd := utils.Min(5, len(queue.Tracks)-currentIndex)

		for i := 0; i < tracksToAdd; i++ {
			trackID := queue.Tracks[currentIndex+i]
			if err := s.spotifyService.AddToQueue(accessToken, "spotify:track:"+trackID); err != nil {
				log.Printf("Error adding track to queue: %v", err)
				continue
			}
		}

		queue.Index = (currentIndex + tracksToAdd) % len(queue.Tracks)
		s.mu.Unlock()
	}
}

func (s *ActiveQueueService) shouldAddMoreTracks(playerState map[string]interface{}, queueLength int) bool {
	// Add more tracks if queue length is below threshold
	if queueLength < 3 {
		return true
	}

	// Check if current track is near end
	if progress, ok := playerState["progress_ms"].(float64); ok {
		if duration, ok := playerState["item"].(map[string]interface{})["duration_ms"].(float64); ok {
			remainingPercent := (duration - progress) / duration
			return remainingPercent < 0.2 // Add more tracks when current track is in last 20%
		}
	}

	return false
}

func (s *ActiveQueueService) EndSession(userID string) {
	s.mu.Lock()
	delete(s.activeQueues, userID)
	s.mu.Unlock()
}

type QueueItem struct {
	ID       string                `json:"id"`
	Name     string                `json:"name"`
	Artists  []string              `json:"artists"`
	Score    float64               `json:"score"`
	Features *models.AudioFeatures `json:"features"`
}

func (s *ActiveQueueService) GetCurrentQueue(ctx context.Context, userID string, accessToken string) ([]QueueItem, error) {
	s.mu.RLock()
	queue, exists := s.activeQueues[userID]
	s.mu.RUnlock()

	if !exists {
		return nil, fmt.Errorf("no active queue for user")
	}

	// Get Spotify queue to know what's actually queued
	_, err := s.spotifyService.GetQueue(accessToken)
	if err != nil {
		return nil, fmt.Errorf("failed to get spotify queue: %w", err)
	}

	// Get enriched track info for upcoming tracks
	currentIndex := queue.Index
	remainingTracks := queue.Tracks[currentIndex:utils.Min(currentIndex+10, len(queue.Tracks))]

	var queueItems []QueueItem
	for _, trackID := range remainingTracks {
		// Get enriched track data
		track, err := s.enrichedTrackDAO.GetByID(ctx, trackID)
		if err != nil {
			log.Printf("Warning: Could not get enriched track %s: %v", trackID, err)
			continue
		}

		// Get user preferences for the track
		userPrefs, err := s.queueService.userPrefsDAO.GetUserTrackPrefs(ctx, track.UserID, track.SpotifyID)
		if err != nil {
			log.Printf("Warning: Could not get user preferences for track %s: %v", trackID, err)
			continue
		}

		// Calculate score for this track using private method
		score := s.queueService.calculateTrackScore(track, queue.Prefs, userPrefs)

		item := QueueItem{
			ID:       track.SpotifyID,
			Name:     track.Name,
			Artists:  track.Artists,
			Score:    score,
			Features: track.AudioFeatures,
		}

		queueItems = append(queueItems, item)
	}

	return queueItems, nil
}
