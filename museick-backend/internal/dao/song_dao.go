package dao

import (
	"context"
	"fmt"

	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type SongDAO struct {
	collection *mongo.Collection
}

func NewSongDAO(client *mongo.Client, dbName, collectionName string) *SongDAO {
	collection := client.Database(dbName).Collection(collectionName)
	return &SongDAO{collection}
}

func (dao *SongDAO) InsertSong(ctx context.Context, song *models.Song) error {
	_, err := dao.collection.InsertOne(ctx, song)
	return err
}

// GetSongByID fetches a song by its ID
func (dao *SongDAO) GetSongByID(ctx context.Context, id string) (*models.Song, error) {
	var song models.Song
	filter := bson.M{"_id": id}
	err := dao.collection.FindOne(ctx, filter).Decode(&song)
	if err != nil {
		return nil, fmt.Errorf("could not find song with ID %s: %v", id, err)
	}
	return &song, nil
}

// ListSongs retrieves all songs for a user
func (dao *SongDAO) ListSongs(ctx context.Context, userID string) ([]*models.Song, error) {
	filter := bson.M{"user_id": userID}
	cursor, err := dao.collection.Find(ctx, filter)
	if err != nil {
		return nil, fmt.Errorf("could not retrieve songs: %v", err)
	}
	defer cursor.Close(ctx)

	var songs []*models.Song
	for cursor.Next(ctx) {
		var song models.Song
		if err := cursor.Decode(&song); err != nil {
			return nil, fmt.Errorf("could not decode song: %v", err)
		}
		songs = append(songs, &song)
	}

	if err := cursor.Err(); err != nil {
		return nil, fmt.Errorf("cursor error: %v", err)
	}

	return songs, nil
}
