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

// SpotifyArtistDAO defines the interface for artist data access operations.
type SpotifyArtistDAO interface {
	Upsert(ctx context.Context, artist *models.SpotifyArtist) error
	GetByID(ctx context.Context, spotifyID string) (*models.SpotifyArtist, error)
}

type spotifyArtistDAOImpl struct {
	collection *mongo.Collection
}

// NewSpotifyArtistDAO creates a new instance of SpotifyArtistDAO.
func NewSpotifyArtistDAO(client *mongo.Client, dbName string, collectionName string) SpotifyArtistDAO {
	collection := client.Database(dbName).Collection(collectionName)
	log.Printf("Initializing SpotifyArtistDAO with collection: %s.%s", dbName, collectionName)
	return &spotifyArtistDAOImpl{collection: collection}
}

// Upsert inserts a new artist document or updates an existing one based on SpotifyID (_id).
func (dao *spotifyArtistDAOImpl) Upsert(ctx context.Context, artist *models.SpotifyArtist) error {
	if artist.SpotifyID == "" {
		return fmt.Errorf("SpotifyID cannot be empty for upsert")
	}
	artist.LastFetchedAt = primitive.NewDateTimeFromTime(time.Now())

	filter := bson.M{"_id": artist.SpotifyID}
	update := bson.M{"$set": artist}
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, update, opts)
	if err != nil {
		log.Printf("Error upserting artist with SpotifyID '%s': %v\n", artist.SpotifyID, err)
		return fmt.Errorf("error upserting artist: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new artist with SpotifyID: %s", artist.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated existing artist with SpotifyID: %s", artist.SpotifyID)
	} else if result.MatchedCount > 0 {
		log.Printf("Artist with SpotifyID %s already up-to-date.", artist.SpotifyID)
	}

	return nil
}

// GetByID finds an artist by its Spotify ID (_id).
// Returns mongo.ErrNoDocuments if the artist is not found.
func (dao *spotifyArtistDAOImpl) GetByID(ctx context.Context, spotifyID string) (*models.SpotifyArtist, error) {
	var artist models.SpotifyArtist
	filter := bson.M{"_id": spotifyID}

	err := dao.collection.FindOne(ctx, filter).Decode(&artist)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		log.Printf("Error finding artist by SpotifyID '%s': %v\n", spotifyID, err)
		return nil, fmt.Errorf("error finding artist: %w", err)
	}

	return &artist, nil
}
