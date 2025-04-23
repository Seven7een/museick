package dao

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/seven7een/museick/museick-backend/internal/shufl/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type EnrichedTrackDAO interface {
	Upsert(ctx context.Context, track *models.EnrichedTrack) error
	GetByID(ctx context.Context, spotifyID string) (*models.EnrichedTrack, error)
	GetByIDs(ctx context.Context, spotifyIDs []string) ([]*models.EnrichedTrack, error)
	GetRandomTracks(ctx context.Context, filters *models.TrackFilters, limit int) ([]*models.EnrichedTrack, error)
	GetPlayable(ctx context.Context, userID string, filters models.TrackFilters) ([]*models.EnrichedTrack, error)
}

type enrichedTrackDAOImpl struct {
	collection *mongo.Collection
}

func NewEnrichedTrackDAO(client *mongo.Client, dbName string) EnrichedTrackDAO {
	collection := client.Database(dbName).Collection("shufl_tracks")

	// Create indexes for efficient querying
	indexModels := []mongo.IndexModel{
		{
			// Index for audio features for shuffle filters
			Keys: bson.D{
				{Key: "audio_features.danceability", Value: 1},
				{Key: "audio_features.energy", Value: 1},
				{Key: "audio_features.valence", Value: 1},
				{Key: "audio_features.tempo", Value: 1},
			},
		},
		{
			// Index for genre-based filtering
			Keys: bson.D{{Key: "genres", Value: 1}},
		},
	}

	// Create indexes
	for _, indexModel := range indexModels {
		_, err := collection.Indexes().CreateOne(context.Background(), indexModel)
		if err != nil {
			log.Printf("⚠️ Could not create index on shufl_tracks collection: %v\n", err)
		}
	}

	log.Printf("Initializing EnrichedTrackDAO with collection: %s.shufl_tracks", dbName)
	return &enrichedTrackDAOImpl{collection: collection}
}

func (dao *enrichedTrackDAOImpl) Upsert(ctx context.Context, track *models.EnrichedTrack) error {
	if track.SpotifyID == "" {
		return fmt.Errorf("SpotifyID cannot be empty for upsert")
	}

	now := primitive.NewDateTimeFromTime(time.Now())
	currentDoc := bson.M{
		"$set": track,
		"$setOnInsert": bson.M{
			"created_at": now,
		},
		"$currentDate": bson.M{
			"updated_at": true,
		},
	}

	filter := bson.M{"_id": track.SpotifyID}
	opts := options.Update().SetUpsert(true)

	result, err := dao.collection.UpdateOne(ctx, filter, currentDoc, opts)
	if err != nil {
		log.Printf("Error upserting enriched track '%s': %v\n", track.SpotifyID, err)
		return fmt.Errorf("error upserting track: %w", err)
	}

	if result.UpsertedCount > 0 {
		log.Printf("Inserted new enriched track: %s", track.SpotifyID)
	} else if result.ModifiedCount > 0 {
		log.Printf("Updated existing enriched track: %s", track.SpotifyID)
	}

	return nil
}

func (dao *enrichedTrackDAOImpl) GetByID(ctx context.Context, spotifyID string) (*models.EnrichedTrack, error) {
	var track models.EnrichedTrack
	if err := dao.collection.FindOne(ctx, bson.M{"_id": spotifyID}).Decode(&track); err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, mongo.ErrNoDocuments
		}
		return nil, fmt.Errorf("error finding track: %w", err)
	}
	return &track, nil
}

func (dao *enrichedTrackDAOImpl) GetByIDs(ctx context.Context, spotifyIDs []string) ([]*models.EnrichedTrack, error) {
	filter := bson.M{"_id": bson.M{"$in": spotifyIDs}}
	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error finding tracks: %w", err)
	}
	defer cursor.Close(ctx)

	var tracks []*models.EnrichedTrack
	if err = cursor.All(ctx, &tracks); err != nil {
		return nil, fmt.Errorf("error decoding tracks: %w", err)
	}
	return tracks, nil
}

func (dao *enrichedTrackDAOImpl) GetRandomTracks(ctx context.Context, filters *models.TrackFilters, limit int) ([]*models.EnrichedTrack, error) {
	filter := bson.M{}

	if filters != nil {
		if len(filters.Genres) > 0 {
			filter["genres"] = bson.M{"$in": filters.Genres}
		}

		if filters.AudioFeatures != nil {
			if danceRange, ok := filters.AudioFeatures["danceability"]; ok {
				filter["audio_features.danceability"] = bson.M{
					"$gte": danceRange.Min,
					"$lte": danceRange.Max,
				}
			}
			// Add other audio feature filters similarly
		}
	}

	// Use aggregation to get random tracks
	pipeline := mongo.Pipeline{
		{{Key: "$match", Value: filter}},
		{{Key: "$sample", Value: bson.M{"size": limit}}},
	}

	cursor, err := dao.collection.Aggregate(ctx, pipeline)
	if err != nil {
		return nil, fmt.Errorf("error getting random tracks: %w", err)
	}
	defer cursor.Close(ctx)

	var tracks []*models.EnrichedTrack
	if err = cursor.All(ctx, &tracks); err != nil {
		return nil, fmt.Errorf("error decoding tracks: %w", err)
	}
	return tracks, nil
}

// GetPlayable returns playable tracks for a user based on filters
func (dao *enrichedTrackDAOImpl) GetPlayable(ctx context.Context, userID string, filters models.TrackFilters) ([]*models.EnrichedTrack, error) {
	// Build base filter for playable tracks (has preview_url, valid audio features, etc)
	filter := bson.M{
		"preview_url":    bson.M{"$ne": ""},  // Must have a preview URL
		"audio_features": bson.M{"$ne": nil}, // Must have audio features analyzed
	}

	// Apply audio feature filters if specified
	if filters.AudioFeatures != nil {
		if danceRange, ok := filters.AudioFeatures["danceability"]; ok {
			filter["audio_features.danceability"] = bson.M{
				"$gte": danceRange.Min,
				"$lte": danceRange.Max,
			}
		}
		// Add more audio feature filters as needed
	}

	// Apply genre filters
	if len(filters.Genres) > 0 {
		filter["genres"] = bson.M{"$in": filters.Genres}
	}

	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("error finding playable tracks: %w", err)
	}
	defer cursor.Close(ctx)

	var tracks []*models.EnrichedTrack
	if err = cursor.All(ctx, &tracks); err != nil {
		return nil, fmt.Errorf("error decoding playable tracks: %w", err)
	}

	return tracks, nil
}
