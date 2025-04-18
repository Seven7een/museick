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

// SpotifySongDAO defines the interface for song data access operations.
type SpotifySongDAO interface {
	Upsert(ctx context.Context, song *models.SpotifySong) error
	GetByID(ctx context.Context, spotifyID string) (*models.SpotifySong, error)
}

type spotifySongDAOImpl struct {
	collection *mongo.Collection
}

// NewSpotifySongDAO creates a new instance of SpotifySongDAO.
func NewSpotifySongDAO(client *mongo.Client, dbName string, collectionName string) SpotifySongDAO {
	collection := client.Database(dbName).Collection(collectionName)
	// Optional: Create index on _id if not default, though it usually is.
	// Ensure TTL index if you want old songs to expire (consider implications)
	log.Printf("Initializing SpotifySongDAO with collection: %s.%s", dbName, collectionName)
	return &spotifySongDAOImpl{collection: collection}
}

// Upsert inserts a new song document or updates an existing one based on SpotifyID (_id).
func (dao *spotifySongDAOImpl) Upsert(ctx context.Context, song *models.SpotifySong) error {
	if song.SpotifyID == "" {
		return fmt.Errorf("SpotifyID cannot be empty for upsert")
	}
	song.LastFetchedAt = primitive.NewDateTimeFromTime(time.Now()) // Update fetch time

	filter := bson.M{"_id": song.SpotifyID}
	update := bson.M{"$set": song} // Use $set to update fields
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting song with SpotifyID '%s': %v\n", song.SpotifyID, err)
		return fmt.Errorf("error upserting song: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new song with SpotifyID: %s", song.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated existing song with SpotifyID: %s", song.SpotifyID)
	} else if result.MatchedCount > 0 {
		log.Printf("Song with SpotifyID %s already up-to-date.", song.SpotifyID)
	}

	return nil
}

// GetByID finds a song by its Spotify ID (_id).
// Returns mongo.ErrNoDocuments if the song is not found.
func (dao *spotifySongDAOImpl) GetByID(ctx context.Context, spotifyID string) (*models.SpotifySong, error) {
	var song models.SpotifySong
	filter := bson.M{"_id": spotifyID}

	err := dao.collection.FindOne(ctx, filter).Decode(&song)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments // Return specific error
		}
		log.Printf("Error finding song by SpotifyID '%s': %v\n", spotifyID, err)
		return nil, fmt.Errorf("error finding song: %w", err)
	}

	return &song, nil
}
