package services

import (
	"context"
	"fmt"
	"log"
	"math"
	"sort"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/shufl/dao"
	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
)

// AudioFeatureWeights defines how much each feature contributes to final score
var AudioFeatureWeights = map[string]float64{
	"danceability":     1.0,
	"energy":           1.0,
	"valence":          1.0,
	"tempo":            0.7,
	"instrumentalness": 0.5,
	"acousticness":     0.5,
	"liveness":         0.3,
	"speechiness":      0.3,
}

type QueueService struct {
	enrichedTrackDAO dao.EnrichedTrackDAO
	userPrefsDAO     dao.UserTrackPrefsDAO
}

type TrackScore struct {
	TrackID string
	Score   float64
}

func NewQueueService(enrichedTrackDAO dao.EnrichedTrackDAO, userPrefsDAO dao.UserTrackPrefsDAO) *QueueService {
	return &QueueService{
		enrichedTrackDAO: enrichedTrackDAO,
		userPrefsDAO:     userPrefsDAO,
	}
}

func (s *QueueService) GenerateQueue(ctx context.Context, userID string, prefs *models.ShufflePreferences) ([]string, error) {
	// Get all tracks from user's library that match filters
	tracks, err := s.enrichedTrackDAO.GetPlayable(ctx, userID, models.TrackFilters{
		Genres:        prefs.Genres,
		Tags:          prefs.Tags,
		AudioFeatures: s.convertPrefsToRanges(prefs.AudioFeatures),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to get playable tracks: %w", err)
	}

	if len(tracks) == 0 {
		return nil, fmt.Errorf("no tracks match the current preferences")
	}

	// Extract track IDs to fetch preferences
	trackIDs := make([]string, len(tracks))
	for i, track := range tracks {
		trackIDs[i] = track.SpotifyID
	}

	// Get user's track preferences for the filtered tracks
	userPrefsList, err := s.userPrefsDAO.GetPrefsForTracks(ctx, userID, trackIDs)
	if err != nil {
		log.Printf("Warning: Could not get user track preferences: %v. Proceeding without them.", err)
		userPrefsList = []*models.UserTrackPrefs{} // Initialize as empty slice if error occurs
	}

	// Convert list of prefs to a map for easy lookup
	trackPrefsMap := make(map[string]*models.UserTrackPrefs)
	for _, pref := range userPrefsList {
		trackPrefsMap[pref.SpotifyID] = pref
	}

	// Score and sort tracks
	scores := make([]TrackScore, 0, len(tracks))
	for _, track := range tracks {
		// Get user's preferences for this track from the map
		userPref, exists := trackPrefsMap[track.SpotifyID]
		score := s.calculateTrackScore(track, prefs, userPref) // Pass userPref (which might be nil)
		// Apply user's weight preference if it exists and is explicitly set
		if exists && userPref.Weight != 0 { // Check exists before accessing userPref.Weight
			score *= userPref.Weight
		}
		scores = append(scores, TrackScore{
			TrackID: track.SpotifyID,
			Score:   score,
		})
	}

	// Sort by score (highest first)
	sort.Slice(scores, func(i, j int) bool {
		return scores[i].Score > scores[j].Score
	})

	// Extract track IDs in order
	queue := make([]string, len(scores))
	for i, score := range scores {
		queue[i] = score.TrackID
	}

	return queue, nil
}

func (s *QueueService) calculateTrackScore(
	track *models.EnrichedTrack,
	prefs *models.ShufflePreferences,
	userPrefs *models.UserTrackPrefs, // Can be nil if no prefs exist for the track
) float64 {
	var totalScore float64
	var totalWeight float64

	// 1. Calculate audio feature match score
	for feature, pref := range prefs.AudioFeatures {
		weight := AudioFeatureWeights[feature]
		if weight == 0 {
			continue
		}

		var actualValue float64
		switch feature {
		case "danceability":
			actualValue = track.AudioFeatures.Danceability
		case "energy":
			actualValue = track.AudioFeatures.Energy
		case "valence":
			actualValue = track.AudioFeatures.Valence
		case "tempo":
			actualValue = track.AudioFeatures.Tempo / 200.0 // Normalize tempo to 0-1 range
		case "instrumentalness":
			actualValue = track.AudioFeatures.Instrumentalness
		case "acousticness":
			actualValue = track.AudioFeatures.Acousticness
		case "liveness":
			actualValue = track.AudioFeatures.Liveness
		case "speechiness":
			actualValue = track.AudioFeatures.Speechiness
		default:
			continue
		}

		// Calculate similarity score (1 - absolute difference)
		similarity := 1.0 - math.Abs(actualValue-pref.Target)

		// Apply feature weight and user preference weight
		weightedScore := similarity * weight * pref.Weight
		totalScore += weightedScore
		totalWeight += weight * pref.Weight
	}

	// Normalize score
	if totalWeight > 0 {
		totalScore /= totalWeight
	}

	// 2. Apply memory bias (reduce score for recently played tracks)
	// Check if userPrefs is not nil before accessing its fields
	if userPrefs != nil && userPrefs.LastPlayed != nil {
		hoursSince := time.Since(*userPrefs.LastPlayed).Hours()
		// Ensure memoryBias calculation handles potential division by zero or very small numbers if needed, though hoursSince/24.0 is generally safe.
		memoryBias := math.Min(math.Max(0, hoursSince/24.0), 1.0) // Clamp bias between 0 and 1
		totalScore *= (0.5 + 0.5*memoryBias)                      // Scale between 50-100% of original score
	}

	// 3. Apply snooze factor
	if userPrefs != nil && userPrefs.SnoozedUntil != nil && time.Now().Before(*userPrefs.SnoozedUntil) {
		// If the track is snoozed, drastically reduce its score or set to 0
		return 0 // Or a very small number
	}

	return totalScore
}

func (s *QueueService) convertPrefsToRanges(prefs map[string]models.AudioFeaturePreference) map[string]models.AudioFeatureRange {
	ranges := make(map[string]models.AudioFeatureRange)
	for feature, pref := range prefs {
		// Create a range around the target value based on weight
		tolerance := 0.3 / pref.Weight // Higher weight = smaller tolerance
		min := math.Max(0, pref.Target-tolerance)
		max := math.Min(1, pref.Target+tolerance)
		ranges[feature] = models.AudioFeatureRange{
			Min: &min,
			Max: &max,
		}
	}
	return ranges
}
