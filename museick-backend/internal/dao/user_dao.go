package dao

import (
	"context"
	"fmt"

	"github.com/seven7een/museick/museick-backend/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type UserDAO struct {
	collection *mongo.Collection
}

func NewUserDAO(client *mongo.Client, dbName, collectionName string) *UserDAO {
	collection := client.Database(dbName).Collection(collectionName)
	return &UserDAO{collection}
}

// InsertUser creates a new user entry
func (dao *UserDAO) InsertUser(ctx context.Context, user *models.User) error {
	_, err := dao.collection.InsertOne(ctx, user)
	if err != nil {
		return fmt.Errorf("error inserting user: %v", err)
	}
	return nil
}

// GetUserBySub retrieves a user by their `sub`
func (dao *UserDAO) GetUserBySub(ctx context.Context, sub string) (*models.User, error) {
	var user models.User
	filter := bson.M{"sub": sub}
	err := dao.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		if err == mongo.ErrNoDocuments {
			return nil, nil
		}
		return nil, fmt.Errorf("error finding user by sub: %v", err)
	}
	return &user, nil
}
