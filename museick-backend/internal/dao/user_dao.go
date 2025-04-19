package dao

import (
	"context"
	"fmt"
	"log"

	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// UserDAO defines the interface for user data access operations.
type UserDAO interface {
	FindBySub(ctx context.Context, sub string) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	UpdateRefreshToken(ctx context.Context, sub string, refreshToken string) error
	// TODO: Add other methods like Delete if needed
}

// userDAOImpl implements the UserDAO interface using MongoDB.
type userDAOImpl struct {
	collection *mongo.Collection
}

// NewUserDAO creates a new instance of UserDAO.
func NewUserDAO(client *mongo.Client, dbName string, collectionName string) UserDAO {
	collection := client.Database(dbName).Collection(collectionName)
	// Create index on 'sub' field for efficient lookups if it doesn't exist
	indexModel := mongo.IndexModel{
		Keys:    bson.M{"sub": 1},
		Options: options.Index().SetUnique(true),
	}
	_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		// Log the error but don't necessarily fail startup, maybe index exists
		// TODO: Check for exists error
		log.Printf("⚠️ Could not create index on users collection 'sub' field: %v\n", err)
	} else {
		log.Println("✅ Index on users collection 'sub' field ensured.")
	}
	return &userDAOImpl{collection: collection}
}

// FindBySub finds a user by their Clerk subject ID.
// Returns mongo.ErrNoDocuments if the user is not found.
func (dao *userDAOImpl) FindBySub(ctx context.Context, sub string) (*models.User, error) {
	var user models.User
	filter := bson.M{"sub": sub}

	err := dao.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		log.Printf("Error finding user by sub '%s': %v\n", sub, err)
		return nil, fmt.Errorf("error finding user: %w", err)
	}

	return &user, nil
}

// Create inserts a new user document into the database.
func (dao *userDAOImpl) Create(ctx context.Context, user *models.User) error {
	// TODO: Consider adding CreatedAt/UpdatedAt timestamps here if needed in the model
	_, err := dao.collection.InsertOne(ctx, user)
	if err != nil {
		// Handle potential duplicate key error if index creation failed but constraint exists
		if mongo.IsDuplicateKeyError(err) {
			log.Printf("Attempted to create duplicate user with sub '%s'\n", user.Sub)
			// Usually, for sync, finding the existing user is enough, so no error needed here.
			// If Create is called outside sync, it might return a specific error.
			return nil // Or a custom duplicate error
		}
		log.Printf("Error creating user with sub '%s': %v\n", user.Sub, err)
		return fmt.Errorf("error creating user: %w", err) // Wrap internal error
	}
	log.Printf("Successfully created user with sub '%s'\n", user.Sub)
	return nil
}

// UpdateRefreshToken updates the Spotify refresh token for a user identified by their sub.
func (dao *userDAOImpl) UpdateRefreshToken(ctx context.Context, sub string, refreshToken string) error {
	filter := bson.M{"sub": sub}
	update := bson.M{
		"$set": bson.M{"spotify_refresh_token": refreshToken},
	}

	result, err := dao.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		log.Printf("Error updating refresh token for user sub '%s': %v\n", sub, err)
		return fmt.Errorf("error updating refresh token: %w", err)
	}

	if result.MatchedCount == 0 {
		log.Printf("Attempted to update refresh token for non-existent user sub '%s'\n", sub)
		return fmt.Errorf("user with sub '%s' not found for refresh token update", sub) // Or return nil if this is acceptable
	}

	log.Printf("Successfully updated refresh token for user sub '%s'\n", sub)
	return nil
}
