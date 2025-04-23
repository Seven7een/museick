package dao

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type UserLibraryDAO interface {
	Upsert(ctx context.Context, library *models.UserLibrary) error
	GetByUser(ctx context.Context, userID string) (*models.UserLibrary, error)
	UpdateLastSync(ctx context.Context, userID string, playlistID string) error
}

type userLibraryDAOImpl struct {
	collection *mongo.Collection
}

func NewUserLibraryDAO(client *mongo.Client, dbName string) UserLibraryDAO {
	collection := client.Database(dbName).Collection("user_libraries")

	// Create index on user_id for fast lookups
	indexModel := mongo.IndexModel{
		Keys:    bson.D{{Key: "user_id", Value: 1}},
		Options: options.Index().SetUnique(true),
	}

	_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		log.Printf("⚠️ Could not create index on user_libraries collection: %v\n", err)
	}

	log.Printf("Initializing UserLibraryDAO with collection: %s.user_libraries", dbName)
	return &userLibraryDAOImpl{collection: collection}
}

func (dao *userLibraryDAOImpl) Upsert(ctx context.Context, library *models.UserLibrary) error {
	library.LastSynced = time.Now()

	filter := bson.M{"user_id": library.UserID}
	update := bson.M{"$set": library}
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("error upserting user library: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Created new library for user %s", library.UserID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated library for user %s", library.UserID)
	}

	return nil
}

func (dao *userLibraryDAOImpl) GetByUser(ctx context.Context, userID string) (*models.UserLibrary, error) {
	var library models.UserLibrary
	err := dao.collection.FindOne(ctx, bson.M{"user_id": userID}).Decode(&library)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		return nil, fmt.Errorf("error finding user library: %w", err)
	}
	return &library, nil
}

func (dao *userLibraryDAOImpl) UpdateLastSync(ctx context.Context, userID string, playlistID string) error {
	now := time.Now()
	filter := bson.M{"user_id": userID}
	update := bson.M{
		"$set": bson.M{
			"last_synced":                  now,
			"playlist_syncs." + playlistID: now,
		},
	}

	result, err := dao.collection.UpdateOne(ctx, filter, update)
	if err != nil {
		return fmt.Errorf("error updating sync time: %w", err)
	}
	if result.MatchedCount == 0 {
		return mongo.ErrNoDocuments
	}
	return nil
}
