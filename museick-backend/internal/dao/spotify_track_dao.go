package dao

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// SpotifyTrackDAO defines the interface for track data access operations.
type SpotifyTrackDAO interface {
	Upsert(ctx context.Context, track *models.SpotifyTrack) error
	GetByID(ctx context.Context, spotifyID string) (*models.SpotifyTrack, error)
}

type spotifyTrackDAOImpl struct {
	collection *mongo.Collection
}

// NewSpotifyTrackDAO creates a new instance of SpotifyTrackDAO.
func NewSpotifyTrackDAO(client *mongo.Client, dbName string, collectionName string) SpotifyTrackDAO {
	collection := client.Database(dbName).Collection(collectionName)
	// Optional: Create index on _id if not default, though it usually is.
	// Ensure TTL index if you want old tracks to expire (consider implications)
	log.Printf("Initializing SpotifyTrackDAO with collection: %s.%s", dbName, collectionName)
	return &spotifyTrackDAOImpl{collection: collection}
}

// Upsert inserts a new track document or updates an existing one based on SpotifyID (_id).
func (dao *spotifyTrackDAOImpl) Upsert(ctx context.Context, track *models.SpotifyTrack) error {
	if track.SpotifyID == "" {
		return fmt.Errorf("SpotifyID cannot be empty for upsert")
	}
	track.LastFetchedAt = primitive.NewDateTimeFromTime(time.Now()) // Update fetch time

	filter := bson.M{"_id": track.SpotifyID}
	update := bson.M{"$set": track} // Use $set to update fields
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting track with SpotifyID '%s': %v\n", track.SpotifyID, err)
		return fmt.Errorf("error upserting track: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new track with SpotifyID: %s", track.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated existing track with SpotifyID: %s", track.SpotifyID)
	} else if result.MatchedCount > 0 {
		log.Printf("Track with SpotifyID %s already up-to-date.", track.SpotifyID)
	}

	return nil
}

// GetByID finds a track by its Spotify ID (_id).
// Returns mongo.ErrNoDocuments if the track is not found.
func (dao *spotifyTrackDAOImpl) GetByID(ctx context.Context, spotifyID string) (*models.SpotifyTrack, error) {
	var track models.SpotifyTrack
	filter := bson.M{"_id": spotifyID}

	err := dao.collection.FindOne(ctx, filter).Decode(&track)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments // Return specific error
		}
		log.Printf("Error finding track by SpotifyID '%s': %v\n", spotifyID, err)
		return nil, fmt.Errorf("error finding track: %w", err)
	}

	return &track, nil
}
