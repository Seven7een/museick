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

// SpotifyAlbumDAO defines the interface for album data access operations.
type SpotifyAlbumDAO interface {
	Upsert(ctx context.Context, album *models.SpotifyAlbum) error
	GetByID(ctx context.Context, spotifyID string) (*models.SpotifyAlbum, error)
}

type spotifyAlbumDAOImpl struct {
	collection *mongo.Collection
}

// NewSpotifyAlbumDAO creates a new instance of SpotifyAlbumDAO.
func NewSpotifyAlbumDAO(client *mongo.Client, dbName string, collectionName string) SpotifyAlbumDAO {
	collection := client.Database(dbName).Collection(collectionName)
	log.Printf("Initializing SpotifyAlbumDAO with collection: %s.%s", dbName, collectionName)
	return &spotifyAlbumDAOImpl{collection: collection}
}

// Upsert inserts a new album document or updates an existing one based on SpotifyID (_id).
func (dao *spotifyAlbumDAOImpl) Upsert(ctx context.Context, album *models.SpotifyAlbum) error {
	if album.SpotifyID == "" {
		return fmt.Errorf("SpotifyID cannot be empty for upsert")
	}
	album.LastFetchedAt = primitive.NewDateTimeFromTime(time.Now())

	filter := bson.M{"_id": album.SpotifyID}
	update := bson.M{"$set": album}
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting album with SpotifyID '%s': %v\n", album.SpotifyID, err)
		return fmt.Errorf("error upserting album: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new album with SpotifyID: %s", album.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated existing album with SpotifyID: %s", album.SpotifyID)
	} else if result.MatchedCount > 0 {
		log.Printf("Album with SpotifyID %s already up-to-date.", album.SpotifyID)
	}

	return nil
}

// GetByID finds an album by its Spotify ID (_id).
// Returns mongo.ErrNoDocuments if the album is not found.
func (dao *spotifyAlbumDAOImpl) GetByID(ctx context.Context, spotifyID string) (*models.SpotifyAlbum, error) {
	var album models.SpotifyAlbum
	filter := bson.M{"_id": spotifyID}

	err := dao.collection.FindOne(ctx, filter).Decode(&album)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		log.Printf("Error finding album by SpotifyID '%s': %v\n", spotifyID, err)
		return nil, fmt.Errorf("error finding album: %w", err)
	}

	return &album, nil
}
