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

type UserTrackPrefsDAO interface {
	Upsert(ctx context.Context, prefs *models.UserTrackPrefs) error
	GetByUserAndTrack(ctx context.Context, userID, trackID string) (*models.UserTrackPrefs, error)
	GetPrefsForTracks(ctx context.Context, userID string, trackIDs []string) ([]*models.UserTrackPrefs, error)
	UpdateWeight(ctx context.Context, userID, trackID string, weight float64) error
	UpdateSnoozeTime(ctx context.Context, userID, trackID string, snoozeUntil time.Time) error
	GetUserTrackWeights(ctx context.Context, userID string) (map[string]float64, error)
	GetUserTrackPrefs(ctx context.Context, userID, trackID string) (*models.UserTrackPrefs, error)
}

type userTrackPrefsDAOImpl struct {
	collection *mongo.Collection
}

func NewUserTrackPrefsDAO(client *mongo.Client, dbName string) UserTrackPrefsDAO {
	collection := client.Database(dbName).Collection("user_track_prefs")

	// Create compound index for user+track lookups
	indexModel := mongo.IndexModel{
		Keys: bson.D{
			{Key: "user_id", Value: 1},
			{Key: "spotify_id", Value: 1},
		},
		Options: options.Index().SetUnique(true),
	}

	_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
	if err != nil {
		log.Printf("⚠️ Could not create index on user_track_prefs collection: %v\n", err)
	}

	log.Printf("Initializing UserTrackPrefsDAO with collection: %s.user_track_prefs", dbName)
	return &userTrackPrefsDAOImpl{collection: collection}
}

func (dao *userTrackPrefsDAOImpl) Upsert(ctx context.Context, prefs *models.UserTrackPrefs) error {
	prefs.UpdatedAt = time.Now()

	filter := bson.M{
		"user_id":    prefs.UserID,
		"spotify_id": prefs.SpotifyID,
	}
	update := bson.M{"$set": prefs}
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("error upserting track prefs: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Created new track prefs for user %s, track %s", prefs.UserID, prefs.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated track prefs for user %s, track %s", prefs.UserID, prefs.SpotifyID)
	}

	return nil
}

func (dao *userTrackPrefsDAOImpl) GetByUserAndTrack(ctx context.Context, userID, trackID string) (*models.UserTrackPrefs, error) {
	filter := bson.M{
		"user_id":    userID,
		"spotify_id": trackID,
	}

	var prefs models.UserTrackPrefs
	err := dao.collection.FindOne(ctx, filter).Decode(&prefs)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		return nil, fmt.Errorf("error finding track prefs: %w", err)
	}

	return &prefs, nil
}

func (dao *userTrackPrefsDAOImpl) GetPrefsForTracks(ctx context.Context, userID string, trackIDs []string) ([]*models.UserTrackPrefs, error) {
	filter := bson.M{
		"user_id":    userID,
		"spotify_id": bson.M{"$in": trackIDs},
	}

	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error finding track prefs: %w", err)
	}
	defer cursor.Close(ctx)

	var prefs []*models.UserTrackPrefs
	if err = cursor.All(ctx, &prefs); err != nil {
		return nil, fmt.Errorf("error decoding track prefs: %w", err)
	}

	return prefs, nil
}

func (dao *userTrackPrefsDAOImpl) UpdateWeight(ctx context.Context, userID, trackID string, weight float64) error {
	filter := bson.M{
		"user_id":    userID,
		"spotify_id": trackID,
	}
	update := bson.M{
		"$set": bson.M{
			"weight":     weight,
			"updated_at": time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("error updating track weight: %w", err)
	}

	return nil
}

func (dao *userTrackPrefsDAOImpl) UpdateSnoozeTime(ctx context.Context, userID, trackID string, snoozeUntil time.Time) error {
	filter := bson.M{
		"user_id":    userID,
		"spotify_id": trackID,
	}
	update := bson.M{
		"$set": bson.M{
			"snooze_until": snoozeUntil,
			"updated_at":   time.Now(),
		},
	}
	opts := options.Update().SetUpsert(true)

	_, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		return fmt.Errorf("error updating snooze time: %w", err)
	}

	return nil
}

// GetUserTrackWeights retrieves all track weights for a given user
func (dao *userTrackPrefsDAOImpl) GetUserTrackWeights(ctx context.Context, userID string) (map[string]float64, error) {
	filter := bson.M{"user_id": userID}
	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error finding user track prefs: %w", err)
	}
	defer cursor.Close(ctx)

	weights := make(map[string]float64)
	var prefs models.UserTrackPrefs
	for cursor.Next(ctx) {
		if err := cursor.Decode(&prefs); err != nil {
			return nil, fmt.Errorf("error decoding track prefs: %w", err)
		}
		if prefs.Weight != 0 { // Only include tracks with non-zero weights
			weights[prefs.SpotifyID] = prefs.Weight
		}
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("error iterating track prefs: %w", err)
	}

	return weights, nil
}

func (dao *userTrackPrefsDAOImpl) GetUserTrackPrefs(ctx context.Context, userID, trackID string) (*models.UserTrackPrefs, error) {
	filter := bson.M{
		"user_id":  userID,
		"track_id": trackID,
	}

	var prefs models.UserTrackPrefs
	err := dao.collection.FindOne(ctx, filter).Decode(&prefs)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("error getting user track prefs: %w", err)
	}

	return &prefs, nil
}
