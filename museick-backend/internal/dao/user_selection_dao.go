package dao

import (
	"context"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// ErrSelectionExists is returned by Create when the selection already exists.
var ErrSelectionExists = errors.New("selection already exists")

// UserSelectionDAO defines the interface for user selection data access operations.
type UserSelectionDAO interface {
	Create(ctx context.Context, selection *models.UserSelection) (*models.UserSelection, error)
	// FindByUserMonthSpotifyItem finds a selection based on the unique combination of user, month, and spotify item ID.
	FindByUserMonthSpotifyItem(ctx context.Context, userID, monthYear, spotifyItemID string) (*models.UserSelection, error)
	// FindByRole finds selections matching a specific role for a user/month.
	FindByRole(ctx context.Context, userID, monthYear string, role models.SelectionRole) ([]*models.UserSelection, error)
	// FindSelected finds the currently selected Muse or Ick for a user/month/itemType.
	FindSelected(ctx context.Context, userID, monthYear string, role models.SelectionRole, itemType string) (*models.UserSelection, error)
	Update(ctx context.Context, selectionID primitive.ObjectID, updates bson.M) (*models.UserSelection, error)
	// UpdateRole updates only the role of a selection.
	UpdateRole(ctx context.Context, selectionID primitive.ObjectID, newRole models.SelectionRole, updatedAt primitive.DateTime) error
	Delete(ctx context.Context, selectionID primitive.ObjectID) error
	ListByUserAndMonth(ctx context.Context, userID, monthYear string) ([]*models.UserSelection, error)
	// GetByID retrieves a single selection by its MongoDB ObjectID.
	GetByID(ctx context.Context, selectionID primitive.ObjectID) (*models.UserSelection, error)
	// GetUserSelectionsForYear retrieves selections for a user for a specific year.
	GetUserSelectionsForYear(ctx context.Context, userID string, year int, itemType string, roles []string) ([]*models.UserSelection, error)
	// TODO: Add methods like ListByUserAndType, etc. if needed
}

type userSelectionDAOImpl struct {
	collection *mongo.Collection
}

// NewUserSelectionDAO creates a new instance of UserSelectionDAO.
func NewUserSelectionDAO(client *mongo.Client, dbName string, collectionName string) UserSelectionDAO {
	collection := client.Database(dbName).Collection(collectionName)
	// Create compound index for efficient lookups and uniqueness constraint - i.e. user selections are a unique ciombination of user, month, and item
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "month_year", Value: 1},
			{Key: "spotify_item_id", Value: 1},
		},
		Options: options.Index().SetUnique(true), // Ensure a user can only add the same item once per month/item
	}
	_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		// Log the error but don't necessarily fail startup
		log.Printf("⚠️ Could not create unique index on user_selections collection: %v\n", err)
	} else {
		log.Println("✅ Unique index on user_selections collection ensured.")
	}
	// Add index for listing by user and month
	listIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "month_year", Value: 1},
		},
	}
	_, err = collection.Indexes().CreateOne(context.Background(), listIndexModel)
	if err != nil {
		log.Printf("⚠️ Could not create list index on user_selections collection: %v\n", err)
	} else {
		log.Println("✅ List index on user_selections collection ensured.")
	}
	// Add index for finding by role efficiently
	roleIndexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "month_year", Value: 1},
			{Key: "selection_role", Value: 1},
		},
	}
	_, err = collection.Indexes().CreateOne(context.Background(), roleIndexModel)
	if err != nil {
		log.Printf("⚠️ Could not create role index on user_selections collection: %v\n", err)
	} else {
		log.Println("✅ Role index on user_selections collection ensured.")
	}

	log.Printf("Initializing UserSelectionDAO with collection: %s.%s", dbName, collectionName)
	return &userSelectionDAOImpl{collection: collection}
}

// Create inserts a new user selection document.
func (dao *userSelectionDAOImpl) Create(ctx context.Context, selection *models.UserSelection) (*models.UserSelection, error) {
	selection.ID = primitive.NewObjectID() // Generate new ID
	// Ensure AddedAt and UpdatedAt are set
	now := primitive.NewDateTimeFromTime(time.Now())
	if selection.AddedAt == 0 {
		selection.AddedAt = now
	}
	selection.UpdatedAt = now
	_, err := dao.collection.InsertOne(ctx, selection)
	if err != nil {
		// Handle potential duplicate key error due to unique index
		if mongo.IsDuplicateKeyError(err) {
			log.Printf("Duplicate key error for user '%s', month '%s', item '%s'. Selection already exists.",
				selection.UserID, selection.MonthYear, selection.SpotifyItemID)
			// Simply return the sentinel error. The service layer will handle fetching the existing item if needed.
			return nil, ErrSelectionExists // Return nil item, specific error
		}
		// If it wasn't a duplicate key error, return the wrapped error
		log.Printf("Error creating user selection: %v", err)
		return nil, fmt.Errorf("error creating selection: %w", err)
	}
	log.Printf("Successfully created user selection with ID '%s'\n", selection.ID.Hex())
	return selection, nil
}

// FindByUserMonthSpotifyItem finds a specific selection entry based on the unique index fields.
func (dao *userSelectionDAOImpl) FindByUserMonthSpotifyItem(ctx context.Context, userID, monthYear, spotifyItemID string) (*models.UserSelection, error) {
	var selection models.UserSelection
	// Filter only by the fields in the unique index
	filter := bson.M{
		"user_id":         userID,
		"month_year":      monthYear,
		"spotify_item_id": spotifyItemID,
	}
	err := dao.collection.FindOne(ctx, filter).Decode(&selection)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		log.Printf("Error finding user selection by user/month/item: %v\n", err)
		return nil, fmt.Errorf("error finding selection: %w", err)
	}
	return &selection, nil
}

// FindByRole finds selections matching a specific role for a user/month.
func (dao *userSelectionDAOImpl) FindByRole(ctx context.Context, userID, monthYear string, role models.SelectionRole) ([]*models.UserSelection, error) {
	filter := bson.M{
		"user_id":        userID,
		"month_year":     monthYear,
		"selection_role": role,
	}
	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error finding selections by role '%s' for user '%s', month '%s': %v\n", role, userID, monthYear, err)
		return nil, fmt.Errorf("could not retrieve selections by role: %w", err)
	}
	defer cursor.Close(ctx)

	var selections []*models.UserSelection
	if err = cursor.All(ctx, &selections); err != nil {
		log.Printf("Error decoding selections by role for user '%s', month '%s': %v\n", userID, monthYear, err)
		return nil, fmt.Errorf("could not decode selections by role: %w", err)
	}
	if selections == nil {
		selections = []*models.UserSelection{}
	}
	return selections, nil
}

// FindSelected finds the single currently selected Muse or Ick for a user/month/itemType.
// Expects role to be RoleMuseSelected or RoleIckSelected.
func (dao *userSelectionDAOImpl) FindSelected(ctx context.Context, userID, monthYear string, role models.SelectionRole, itemType string) (*models.UserSelection, error) { // Added itemType
	if role != models.RoleMuseSelected && role != models.RoleIckSelected {
		return nil, fmt.Errorf("invalid role for FindSelected: %s", role)
	}
	var selection models.UserSelection
	// Filter by user, month, role, AND item type
	filter := bson.M{
		"user_id":        userID,
		"month_year":     monthYear,
		"selection_role": role,
		"item_type":      itemType,
	}
	err := dao.collection.FindOne(ctx, filter).Decode(&selection)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments // Not found is not an error here
		}
		log.Printf("Error finding selected item role '%s' for user '%s', month '%s': %v\n", role, userID, monthYear, err)
		return nil, fmt.Errorf("error finding selected item: %w", err)
	}
	return &selection, nil
}

// Update modifies an existing user selection.
func (dao *userSelectionDAOImpl) Update(ctx context.Context, selectionID primitive.ObjectID, updates bson.M) (*models.UserSelection, error) {
	filter := bson.M{"_id": selectionID}
	update := bson.M{"$set": updates}
	opts := options.FindOneAndUpdate().SetReturnDocument(options.After) // Return the updated document

	var updatedSelection models.UserSelection
	err := dao.collection.FindOneAndUpdate(ctx, filter, update, opts).Decode(&updatedSelection)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			log.Printf("No user selection found with ID '%s' to update\n", selectionID.Hex())
			return nil, mongo.ErrNoDocuments
		}
		log.Printf("Error updating user selection with ID '%s': %v\n", selectionID.Hex(), err)
		return nil, fmt.Errorf("error updating selection: %w", err)
	}
	log.Printf("Successfully updated user selection with ID '%s'\n", selectionID.Hex())
	return &updatedSelection, nil
}

// UpdateRole updates only the role and updated_at timestamp of a selection.
func (dao *userSelectionDAOImpl) UpdateRole(ctx context.Context, selectionID primitive.ObjectID, newRole models.SelectionRole, updatedAt primitive.DateTime) error {
	filter := bson.M{"_id": selectionID}
	update := bson.M{"$set": bson.M{
		"selection_role": newRole,
		"updated_at":     updatedAt,
	}}
	result, err := dao.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("Error updating role for selection ID '%s': %v\n", selectionID.Hex(), err)
		return fmt.Errorf("error updating selection role: %w", err)
	}
	if result.MatchedCount == 0 {
		log.Printf("No selection found with ID '%s' to update role\n", selectionID.Hex())
		return mongo.ErrNoDocuments
	}
	log.Printf("Successfully updated role for selection ID '%s' to '%s'\n", selectionID.Hex(), newRole)
	return nil
}

// Delete removes a user selection document.
func (dao *userSelectionDAOImpl) Delete(ctx context.Context, selectionID primitive.ObjectID) error {
	filter := bson.M{"_id": selectionID}
	result, err := dao.collection.DeleteOne(ctx, filter)
	if err != nil {
		log.Printf("Error deleting user selection with ID '%s': %v\n", selectionID.Hex(), err)
		return fmt.Errorf("error deleting selection: %w", err)
	}
	if result.DeletedCount == 0 {
		log.Printf("No user selection found with ID '%s' to delete\n", selectionID.Hex())
		return mongo.ErrNoDocuments // Indicate not found
	}
	log.Printf("Successfully deleted user selection with ID '%s'\n", selectionID.Hex())
	return nil
}

// ListByUserAndMonth retrieves all selections for a specific user and month.
func (dao *userSelectionDAOImpl) ListByUserAndMonth(ctx context.Context, userID, monthYear string) ([]*models.UserSelection, error) {
	filter := bson.M{"user_id": userID, "month_year": monthYear}
	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		log.Printf("Error listing selections for user '%s', month '%s': %v\n", userID, monthYear, err)
		return nil, fmt.Errorf("could not retrieve selections: %w", err)
	}
	defer cursor.Close(ctx)

	var selections []*models.UserSelection
	if err = cursor.All(ctx, &selections); err != nil {
		log.Printf("Error decoding selections for user '%s', month '%s': %v\n", userID, monthYear, err)
		return nil, fmt.Errorf("could not decode selections: %w", err)
	}

	// Return empty slice if no selections found, not nil
	if selections == nil {
		selections = []*models.UserSelection{}
	}

	return selections, nil
}

// GetByID retrieves a single selection by its MongoDB ObjectID.
func (dao *userSelectionDAOImpl) GetByID(ctx context.Context, selectionID primitive.ObjectID) (*models.UserSelection, error) {
	var selection models.UserSelection
	filter := bson.M{"_id": selectionID}
	err := dao.collection.FindOne(ctx, filter).Decode(&selection)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments // Return specific error for not found
		}
		log.Printf("Error finding user selection by ID '%s': %v\n", selectionID.Hex(), err)
		return nil, fmt.Errorf("error finding selection by ID: %w", err)
	}
	return &selection, nil
}

// GetUserSelectionsForYear retrieves selections for a user for a specific year.
func (dao *userSelectionDAOImpl) GetUserSelectionsForYear(ctx context.Context, userID string, year int, itemType string, roles []string) ([]*models.UserSelection, error) {
	// Create filter for the year range (all months of the year)
	startMonth := fmt.Sprintf("%d-01", year)
	endMonth := fmt.Sprintf("%d-12", year)

	filter := bson.M{
		"user_id":   userID,
		"item_type": itemType,
		"month_year": bson.M{
			"$gte": startMonth,
			"$lte": endMonth,
		},
		"selection_role": bson.M{
			"$in": roles,
		},
	}

	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error finding selections: %w", err)
	}
	defer cursor.Close(ctx)

	var selections []*models.UserSelection
	if err = cursor.All(ctx, &selections); err != nil {
		return nil, fmt.Errorf("error decoding selections: %w", err)
	}

	return selections, nil
}
