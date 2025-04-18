package services

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"regexp"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserSelectionService handles business logic related to user selections.
type UserSelectionService struct {
	selectionDAO     dao.UserSelectionDAO
	spotifySyncSvc   *SpotifySyncService
	spotifySvc       *SpotifyService // Keep for potential future use (e.g., client credentials flow)
	refreshThreshold time.Duration
}

// NewUserSelectionService creates a new instance of UserSelectionService.
func NewUserSelectionService(
	selectionDAO dao.UserSelectionDAO,
	spotifySyncSvc *SpotifySyncService,
	spotifySvc *SpotifyService,
) *UserSelectionService {
	log.Println("Initializing UserSelectionService")
	return &UserSelectionService{
		selectionDAO:     selectionDAO,
		spotifySyncSvc:   spotifySyncSvc,
		spotifySvc:       spotifySvc,
		refreshThreshold: 24 * time.Hour,
	}
}

// verifySpotifyItem checks if a Spotify item exists and is accessible with the given token
func (s *UserSelectionService) verifySpotifyItem(spotifyToken string, spotifyItemID string, itemType string) error {
	if spotifyToken == "" {
		return errors.New("spotify token is required for verification")
	}
	var endpoint string
	switch itemType {
	case "track":
		endpoint = fmt.Sprintf("/tracks/%s", spotifyItemID)
	case "album":
		endpoint = fmt.Sprintf("/albums/%s", spotifyItemID)
	case "artist":
		endpoint = fmt.Sprintf("/artists/%s", spotifyItemID)
	default:
		return fmt.Errorf("invalid item type: %s", itemType)
	}

	url := fmt.Sprintf("https://api.spotify.com/v1%s", endpoint)
	req, err := http.NewRequestWithContext(context.Background(), "GET", url, nil) // Use context
	if err != nil {
		return fmt.Errorf("error creating verification request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", spotifyToken))
	httpClient := &http.Client{Timeout: 10 * time.Second}
	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("error making verification request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("spotify authentication failed during verification (status %d)", resp.StatusCode)
	}
	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("spotify item not found during verification")
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("spotify API error during verification: %d", resp.StatusCode)
	}
	return nil
}

// CreateSelection handles the logic for creating a user selection.
// It verifies the Spotify item, ensures the item exists in our local Spotify cache,
// and then creates the UserSelection document, handling duplicates gracefully.
func (s *UserSelectionService) CreateSelection(ctx context.Context, userID string, spotifyToken string, req *models.CreateSelectionRequest) (*models.UserSelection, error) {

	// Validate input
	if !isValidMonthYear(req.MonthYear) {
		return nil, errors.New("invalid MonthYear format, expected YYYY-MM")
	}
	if req.Role != models.RoleMuseCandidate && req.Role != models.RoleIckCandidate {
		return nil, fmt.Errorf("invalid initial selection role: %s. Must be 'muse_candidate' or 'ick_candidate'", req.Role)
	}
	if req.ItemType != "track" && req.ItemType != "album" && req.ItemType != "artist" {
		return nil, fmt.Errorf("invalid item_type: %s. Must be 'track', 'album', or 'artist'", req.ItemType)
	}

	// 1. Verify the Spotify item exists using the provided token
	err := s.verifySpotifyItem(spotifyToken, req.SpotifyItemID, req.ItemType)
	if err != nil {
		log.Printf("Spotify item verification failed for user %s, item %s (%s): %v", userID, req.SpotifyItemID, req.ItemType, err)
		// Return a more specific error if verification failed due to auth
		if errors.Is(err, fmt.Errorf("spotify authentication failed during verification")) { // More specific check might be needed
			return nil, errors.New("spotify authentication failed, please reconnect")
		}
		return nil, fmt.Errorf("failed to verify spotify item: %w", err)
	}

	// 2. Ensure the core Spotify item exists in our local DB cache (sync if needed)
	// Pass the spotifyToken for potential API calls within GetOrSyncItem
	_, err = s.spotifySyncSvc.GetOrSyncItem(ctx, req.SpotifyItemID, req.ItemType, spotifyToken, s.refreshThreshold)
	if err != nil {
		log.Printf("Error ensuring Spotify item %s (%s) exists in local DB for user %s: %v", req.SpotifyItemID, req.ItemType, userID, err)
		// If sync fails (e.g., token expired between verification and sync), we might still proceed
		// but log a warning. For now, return error.
		return nil, fmt.Errorf("failed to sync spotify item to local cache: %w", err)
	}

	// 3. Prepare the UserSelection record
	now := primitive.NewDateTimeFromTime(time.Now())
	newSelection := &models.UserSelection{
		UserID:        userID,
		SpotifyItemID: req.SpotifyItemID,
		ItemType:      req.ItemType,
		SelectionRole: req.Role,
		MonthYear:     req.MonthYear,
		AddedAt:       now,
		UpdatedAt:     now,
		Notes:         req.Notes,
	}

	// 4. Attempt to insert into database
	createdSelection, err := s.selectionDAO.Create(ctx, newSelection)
	if err != nil {
		// Check if the error indicates the selection already exists (using the sentinel error from DAO)
		if errors.Is(err, dao.ErrSelectionExists) {
			// The DAO indicated a duplicate. Now fetch the existing document explicitly.
			log.Printf("Selection already exists for user %s, month %s, item %s. Fetching existing.", userID, req.MonthYear, req.SpotifyItemID)
			existingSelection, findErr := s.selectionDAO.FindByUserMonthSpotifyItem(ctx, userID, req.MonthYear, req.SpotifyItemID)
			if findErr != nil {
				// This is unexpected if ErrSelectionExists was returned, but handle defensively.
				log.Printf("Error fetching existing selection after ErrSelectionExists: %v", findErr)
				return nil, fmt.Errorf("error fetching existing selection after duplicate error: %w", findErr)
			}
			log.Printf("Returning existing selection ID %s.", existingSelection.ID.Hex())
			return existingSelection, nil // Return the fetched existing selection
		}

		// If it's any other error (not ErrSelectionExists)
		log.Printf("Error creating selection: %v", err)
		return nil, fmt.Errorf("error creating selection: %w", err) // Return the original wrapped error
	}

	// Successfully created a new selection
	log.Printf("Successfully created selection ID %s for user %s with role %s", createdSelection.ID.Hex(), userID, req.Role)
	return createdSelection, nil
}


// UpdateSelectionInput defines the input for updating a selection's role or notes.
type UpdateSelectionInput struct {
	SelectionID string // The MongoDB _id of the UserSelection record
	UserID      string // For authorization check
	Role        *models.SelectionRole
	Notes       *string
}

// UpdateSelection modifies an existing selection (e.g., change role, update notes).
// Handles demoting the previously selected item if a new item is selected as Muse/Ick.
func (s *UserSelectionService) UpdateSelection(ctx context.Context, input UpdateSelectionInput) (*models.UserSelection, error) {
	selectionObjID, err := primitive.ObjectIDFromHex(input.SelectionID)
	if err != nil {
		return nil, fmt.Errorf("invalid selection ID format: %w", err)
	}

	updates := bson.M{}
	hasRoleUpdate := false
	var newRole models.SelectionRole

	if input.Role != nil {
		newRole = *input.Role
		if newRole != models.RoleMuseCandidate && newRole != models.RoleIckCandidate &&
			newRole != models.RoleMuseSelected && newRole != models.RoleIckSelected {
			return nil, fmt.Errorf("invalid target selection role: %s", newRole)
		}
		updates["selection_role"] = newRole
		hasRoleUpdate = true
	}
	if input.Notes != nil {
		updates["notes"] = *input.Notes
	}

	if len(updates) == 0 {
		return nil, errors.New("no updates provided")
	}

	now := primitive.NewDateTimeFromTime(time.Now())
	updates["updated_at"] = now

	// --- Authorization & Pre-Update Logic ---
	selectionToUpdate, err := s.selectionDAO.GetByID(ctx, selectionObjID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return nil, errors.New("selection not found")
		}
		log.Printf("Error fetching selection %s for update check: %v", input.SelectionID, err)
		return nil, fmt.Errorf("failed to retrieve selection for update")
	}

	if selectionToUpdate.UserID != input.UserID {
		log.Printf("Authorization error: User %s attempted to update selection %s belonging to user %s", input.UserID, input.SelectionID, selectionToUpdate.UserID)
		return nil, errors.New("authorization failed: selection does not belong to user")
	}

	// --- Demotion Logic ---
	if hasRoleUpdate && (newRole == models.RoleMuseSelected || newRole == models.RoleIckSelected) {
		var roleToDemote models.SelectionRole
		var demoteToRole models.SelectionRole
		if newRole == models.RoleMuseSelected {
			roleToDemote = models.RoleMuseSelected
			demoteToRole = models.RoleMuseCandidate
		} else {
			roleToDemote = models.RoleIckSelected
			demoteToRole = models.RoleIckCandidate
		}

		// Find the currently selected item *of the same type* for this user/month/role
		currentlySelected, err := s.selectionDAO.FindSelected(ctx, input.UserID, selectionToUpdate.MonthYear, roleToDemote, selectionToUpdate.ItemType) // Pass itemType
		if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			log.Printf("Error finding currently selected %s (role %s) for user %s, month %s: %v", selectionToUpdate.ItemType, roleToDemote, input.UserID, selectionToUpdate.MonthYear, err) // Log itemType
			return nil, fmt.Errorf("failed to check current selection status for %s", selectionToUpdate.ItemType)
		}

		if currentlySelected != nil && currentlySelected.ID != selectionObjID {
			log.Printf("Demoting previously selected item %s (role %s) to %s for user %s, month %s",
				currentlySelected.ID.Hex(), roleToDemote, demoteToRole, input.UserID, selectionToUpdate.MonthYear)
			demotionErr := s.selectionDAO.UpdateRole(ctx, currentlySelected.ID, demoteToRole, now)
			if demotionErr != nil {
				log.Printf("Error demoting previous selection %s: %v", currentlySelected.ID.Hex(), demotionErr)
				// TODO: Consider if this should be a fatal error for the update operation
			}
		}
	}

	// --- Perform the Actual Update ---
	updatedSelection, err := s.selectionDAO.Update(ctx, selectionObjID, updates)
	if err != nil {
		log.Printf("Error performing final update on selection ID %s: %v", input.SelectionID, err)
		return nil, fmt.Errorf("failed to update selection: %w", err)
	}

	log.Printf("Successfully updated selection ID %s for user %s", updatedSelection.ID.Hex(), input.UserID)
	return updatedSelection, nil
}

// DeleteSelection removes a user's selection.
func (s *UserSelectionService) DeleteSelection(ctx context.Context, selectionID string, userID string) error {
	selectionObjID, err := primitive.ObjectIDFromHex(selectionID)
	if err != nil {
		return fmt.Errorf("invalid selection ID format: %w", err)
	}

	// Authorization check
	selection, err := s.selectionDAO.GetByID(ctx, selectionObjID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("selection not found")
		}
		log.Printf("Error fetching selection %s for delete check: %v", selectionID, err)
		return fmt.Errorf("failed to retrieve selection for deletion")
	}
	if selection.UserID != userID {
		log.Printf("Authorization error: User %s attempted to delete selection %s belonging to user %s", userID, selectionID, selection.UserID)
		return errors.New("unauthorized")
	}

	// Proceed with deletion
	err = s.selectionDAO.Delete(ctx, selectionObjID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return errors.New("selection not found") // Should have been caught by pre-fetch
		}
		log.Printf("Error deleting selection ID %s for user %s: %v", selectionID, userID, err)
		return fmt.Errorf("failed to delete selection: %w", err)
	}

	log.Printf("Successfully deleted selection ID %s for user %s", selectionID, userID)
	return nil
}

// ListSelectionsByMonth retrieves all selections for a user for a specific month.
func (s *UserSelectionService) ListSelectionsByMonth(ctx context.Context, userID, monthYear string) ([]*models.UserSelection, error) {
	if !isValidMonthYear(monthYear) {
		return nil, errors.New("invalid MonthYear format, expected YYYY-MM")
	}
	selections, err := s.selectionDAO.ListByUserAndMonth(ctx, userID, monthYear)
	if err != nil {
		log.Printf("Error listing selections for user %s, month %s: %v", userID, monthYear, err)
		return nil, fmt.Errorf("failed to list selections: %w", err)
	}
	return selections, nil
}

// --- Helper Functions ---

var monthYearRegex = regexp.MustCompile(`^\d{4}-\d{2}$`)

func isValidMonthYear(monthYear string) bool {
	return monthYearRegex.MatchString(monthYear)
}
