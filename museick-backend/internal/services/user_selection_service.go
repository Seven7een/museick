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
	"github.com/seven7een/museick/museick-backend/internal/handlers"
	"github.com/seven7een/museick/museick-backend/internal/models"
	"github.com/zmb3/spotify/v2" // Required for spotify client
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// UserSelectionService handles business logic related to user selections.
type UserSelectionService struct {
	selectionDAO     dao.UserSelectionDAO
	spotifySyncSvc   *SpotifySyncService
	spotifySvc       *SpotifyService // To get authenticated client
	refreshThreshold time.Duration   // How often to refresh Spotify data
}

// NewUserSelectionService creates a new instance of UserSelectionService.
func NewUserSelectionService(
	selectionDAO dao.UserSelectionDAO,
	spotifySyncSvc *SpotifySyncService,
	spotifySvc *SpotifyService, // Inject SpotifyService to get client
) *UserSelectionService {
	log.Println("Initializing UserSelectionService")
	return &UserSelectionService{
		selectionDAO:     selectionDAO,
		spotifySyncSvc:   spotifySyncSvc,
		spotifySvc:       spotifySvc,
		refreshThreshold: 24 * time.Hour, // Example: Refresh Spotify data daily
	}
}

// AddSelectionInput defines the input for adding a new selection candidate.
type AddSelectionInput struct {
	UserID      string
	SpotifyID   string
	SpotifyType models.SpotifyItemType
	Role        models.SelectionRole // Expect "muse_candidate" or "ick_candidate"
	MonthYear   string               // Format: YYYY-MM
	Notes       string               // Optional
}

// AddSelection adds a new item to the user's selections for a given month.
// It first ensures the core Spotify item exists in the DB (fetching/syncing if necessary).
// The initial role must be a candidate role.
func (s *UserSelectionService) AddSelection(ctx context.Context, input AddSelectionInput) (*models.UserSelection, error) {
	// Validate MonthYear format
	if !isValidMonthYear(input.MonthYear) {
		return nil, errors.New("invalid MonthYear format, expected YYYY-MM")
	}
	// Validate initial Role must be a candidate type
	if input.Role != models.RoleMuseCandidate && input.Role != models.RoleIckCandidate {
		return nil, fmt.Errorf("invalid initial selection role: %s. Must be 'muse_candidate' or 'ick_candidate'", input.Role)
	}

	// 1. Get authenticated Spotify client
	client, err := s.spotifySvc.GetClientForUser(ctx, input.UserID)
	if err != nil {
		log.Printf("Error getting Spotify client for user %s: %v", input.UserID, err)
		return nil, fmt.Errorf("could not get spotify client: %w", err)
	}

	// 2. Ensure the core Spotify item exists in our DB
	_, err = s.spotifySyncSvc.GetOrSyncItem(ctx, input.SpotifyID, input.SpotifyType, client, s.refreshThreshold)
	if err != nil {
		log.Printf("Error ensuring Spotify item %s (%s) exists in DB: %v", input.SpotifyID, input.SpotifyType, err)
		return nil, fmt.Errorf("failed to sync spotify item: %w", err)
	}

	// 3. Create the UserSelection record
	now := primitive.NewDateTimeFromTime(time.Now())
	newSelection := &models.UserSelection{
		UserID:        input.UserID,
		SpotifyID:     input.SpotifyID,
		SpotifyType:   input.SpotifyType,
		SelectionRole: input.Role, // Set the initial candidate role
		MonthYear:     input.MonthYear,
		AddedAt:       now, // Set AddedAt on creation
		UpdatedAt:     now,
		Notes:         input.Notes,
	}

	createdSelection, err := s.selectionDAO.Create(ctx, newSelection)
	if err != nil {
		// Check if it was a duplicate error (user already added this item for this month)
		if existing, findErr := s.selectionDAO.FindByUserMonthItem(ctx, input.UserID, input.MonthYear, input.SpotifyID, input.SpotifyType); findErr == nil && existing != nil {
			log.Printf("Selection already exists for user %s, month %s, item %s (%s). Returning existing.", input.UserID, input.MonthYear, input.SpotifyID, input.SpotifyType)
			// If it exists, just return the existing one. Maybe update notes if provided?
			// For now, just return existing. Frontend might need to handle this case.
			// Optionally update the role if the new role is different? Business decision.
			// Let's keep it simple: return existing, don't update anything on duplicate add.
			return existing, nil // Return the existing selection if duplicate
		}
		// Otherwise, it's some other creation error
		log.Printf("Error creating user selection in DB: %v", err)
		return nil, fmt.Errorf("failed to save selection: %w", err)
	}

	log.Printf("Successfully added selection ID %s for user %s with role %s", createdSelection.ID.Hex(), input.UserID, input.Role)
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
		// Validate new role
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
	// Fetch the selection being updated to check ownership and get details for demotion logic
	selectionToUpdate, err := s.selectionDAO.GetByID(ctx, selectionObjID) // Assuming DAO has GetByID

	if err != nil { // Changed from findErr
		if errors.Is(err, mongo.ErrNoDocuments) { // Use errors.Is for checking mongo errors
			return nil, errors.New("selection not found")
		}
		log.Printf("Error fetching selection %s for update check: %v", input.SelectionID, err) // Changed from findErr
		return nil, fmt.Errorf("failed to retrieve selection for update")
	}

	// Check ownership
	if selectionToUpdate.UserID != input.UserID {
		log.Printf("Authorization error: User %s attempted to update selection %s belonging to user %s", input.UserID, input.SelectionID, selectionToUpdate.UserID)
		return nil, errors.New("authorization failed: selection does not belong to user")
	}

	// --- Demotion Logic (if changing role to *_selected) ---
	if hasRoleUpdate && (newRole == models.RoleMuseSelected || newRole == models.RoleIckSelected) {
		// Determine the role to demote (the currently selected one) and the role to demote to (candidate)
		var roleToDemote models.SelectionRole
		var demoteToRole models.SelectionRole
		if newRole == models.RoleMuseSelected {
			roleToDemote = models.RoleMuseSelected
			demoteToRole = models.RoleMuseCandidate
		} else { // newRole == models.RoleIckSelected
			roleToDemote = models.RoleIckSelected
			demoteToRole = models.RoleIckCandidate
		}

		// Find the currently selected item for this user/month/role
		currentlySelected, err := s.selectionDAO.FindSelected(ctx, input.UserID, selectionToUpdate.MonthYear, roleToDemote)
		if err != nil && !errors.Is(err, mongo.ErrNoDocuments) {
			// Error finding the item to demote
			log.Printf("Error finding currently selected item (role %s) for user %s, month %s: %v", roleToDemote, input.UserID, selectionToUpdate.MonthYear, err)
			return nil, fmt.Errorf("failed to check current selection status")
		}

		// If a different item is currently selected, demote it back to candidate
		if currentlySelected != nil && currentlySelected.ID != selectionObjID {
			log.Printf("Demoting previously selected item %s (role %s) to %s for user %s, month %s",
				currentlySelected.ID.Hex(), roleToDemote, demoteToRole, input.UserID, selectionToUpdate.MonthYear)
			demotionErr := s.selectionDAO.UpdateRole(ctx, currentlySelected.ID, demoteToRole, now)
			if demotionErr != nil {
				// Log error but proceed with the update if possible
				log.Printf("Error demoting previous selection %s: %v", currentlySelected.ID.Hex(), demotionErr)
				// Depending on requirements, you might want to return an error here
			}
		}
	}

	// --- Perform the Actual Update ---
	updatedSelection, err := s.selectionDAO.Update(ctx, selectionObjID, updates)
	if err != nil {
		// Error already handled if it was mongo.ErrNoDocuments during the pre-fetch
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

	// Authorization check: Fetch first to check ownership before deleting.
	// Assuming DAO has GetByID or similar mechanism. Using FindOne directly for now.
	selection, err := s.selectionDAO.GetByID(ctx, selectionObjID) // Use DAO method

	if err != nil { // Changed from findErr
		if errors.Is(err, mongo.ErrNoDocuments) { // Use errors.Is
			return errors.New("selection not found")
		}
		log.Printf("Error fetching selection %s for delete check: %v", selectionID, err) // Changed from findErr
		return fmt.Errorf("failed to retrieve selection for deletion")
	}
	if selection.UserID != userID {
		log.Printf("Authorization error: User %s attempted to delete selection %s belonging to user %s", userID, selectionID, selection.UserID)
		return errors.New("unauthorized") // Return a clear unauthorized error
	}

	// Proceed with deletion
	err = s.selectionDAO.Delete(ctx, selectionObjID)
	if err != nil {
		// DAO's Delete should handle not found, but double-check error type if necessary
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
	// Validate MonthYear format
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

// TODO: Implement GetClientForUser in SpotifyService
// This is a placeholder for where you'd get an authenticated client
// based on stored user tokens (e.g., from database or session).
func (s *SpotifyService) GetClientForUser(ctx context.Context, userID string) (*spotify.Client, error) {
	// 1. Retrieve stored tokens (access, refresh) for the userID from your database.
	// 2. Check if the access token is expired.
	// 3. If expired, use the refresh token to get a new access token from Spotify.
	// 4. Store the new tokens (access, potentially refresh if it changed).
	// 5. Create a spotify.Client using the valid access token.
	// 6. Return the client.

	// Placeholder implementation - returns the basic client or error
	log.Printf("Placeholder: Attempting to get Spotify client for user %s. Needs proper implementation.", userID)
	// This should return an authenticated client based on user's stored tokens
	// For now, return the service's basic client if available, or error.
	// If no client available at all
	return nil, errors.New("spotify client not configured or user tokens not found") // Default error until implemented

	// --- Example of token retrieval/refresh logic (needs user token storage) ---
	/*
	   userTokens, err := s.tokenStore.GetTokens(ctx, userID) // Your token storage mechanism
	   if err != nil {
	       return nil, fmt.Errorf("could not get tokens for user %s: %w", userID, err)
	   }

	   token := &oauth2.Token{
	       AccessToken:  userTokens.AccessToken,
	       RefreshToken: userTokens.RefreshToken,
	       Expiry:       userTokens.Expiry,
	       TokenType:    "Bearer",
	   }

	   // Create a client that automatically refreshes the token
	   auth := spotifyauth.New(
	       spotifyauth.WithClientID(s.clientID),
	       spotifyauth.WithClientSecret(s.clientSecret),
	       // Add RedirectURL if needed for refresh flow context, though often not required for refresh itself
	   )
	   client := auth.Client(ctx, token) // This client handles refresh

	   // Optional: Check if token was refreshed and update storage
	   newToken, err := client.Token()
	   if err == nil && newToken.AccessToken != token.AccessToken {
	       log.Printf("Spotify token refreshed for user %s", userID)
	       // s.tokenStore.UpdateTokens(ctx, userID, newToken) // Update stored tokens
	   }


	   return spotify.New(client), nil
	*/
}

// verifySpotifyItem checks if a Spotify item exists and is accessible with the given token
func (s *UserSelectionService) verifySpotifyItem(spotifyToken string, spotifyID string, itemType models.SpotifyItemType) error {
	// Convert our type to Spotify API endpoint type
	var endpoint string
	switch itemType {
	case models.ItemTypeSong:
		endpoint = fmt.Sprintf("/tracks/%s", spotifyID)
	case models.ItemTypeAlbum:
		endpoint = fmt.Sprintf("/albums/%s", spotifyID)
	case models.ItemTypeArtist:
		endpoint = fmt.Sprintf("/artists/%s", spotifyID)
	default:
		return fmt.Errorf("invalid item type: %s", itemType)
	}

	url := fmt.Sprintf("https://api.spotify.com/v1%s", endpoint)
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return fmt.Errorf("error creating request: %w", err)
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", spotifyToken))
	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("error making request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized || resp.StatusCode == http.StatusForbidden {
		return fmt.Errorf("spotify authentication failed")
	}
	if resp.StatusCode == http.StatusNotFound {
		return fmt.Errorf("spotify item not found")
	}
	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("spotify API error: %d", resp.StatusCode)
	}

	return nil
}

// CreateSelection creates a new user selection after verifying the Spotify item
func (s *UserSelectionService) CreateSelection(ctx context.Context, userID string, spotifyToken string, req *handlers.CreateSelectionRequest) (*models.UserSelection, error) {
	// First verify that the Spotify item exists and is accessible
	err := s.verifySpotifyItem(spotifyToken, req.SpotifyID, req.SpotifyType)
	if err != nil {
		return nil, fmt.Errorf("failed to verify spotify item: %w", err)
	}

	// Parse month year
	parsedTime, err := time.Parse("2006-01", req.MonthYear)
	if err != nil {
		return nil, fmt.Errorf("invalid MonthYear format (required: YYYY-MM): %w", err)
	}

	// Create the selection
	selection := &models.UserSelection{
		UserID:        userID,
		SpotifyID:     req.SpotifyID,
		SpotifyType:   req.SpotifyType,
		SelectionRole: req.Role,
		MonthYear:     req.MonthYear,
		Notes:         req.Notes,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// Insert into database
	err = s.selectionDAO.Create(ctx, selection)
	if err != nil {
		if mongo.IsDuplicateKeyError(err) {
			// If it's a duplicate, find and return the existing selection
			existingSelection, findErr := s.selectionDAO.FindBySpotifyIDAndMonth(ctx, userID, req.SpotifyID, req.MonthYear)
			if findErr != nil {
				return nil, fmt.Errorf("error retrieving existing selection: %w", findErr)
			}
			return existingSelection, nil
		}
		return nil, fmt.Errorf("error creating selection: %w", err)
	}

	return selection, nil
}
