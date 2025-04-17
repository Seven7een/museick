package initializers

import (
	"context"
	"fmt"
	"log"
	"time"

	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// NewMongoConnection establishes a connection to MongoDB using the provided configuration.
func NewMongoConnection(cfg *Config) (*mongo.Client, error) {
	// Construct MongoDB connection URI
	uri := fmt.Sprintf("mongodb://%s:%s@%s:%s/?authSource=admin", // Added authSource=admin, adjust if needed
		cfg.MongoUser, cfg.MongoPassword, cfg.MongoHost, cfg.MongoPort,
	)

	// Set client options
	clientOpts := options.Client().ApplyURI(uri)

	// Connect to MongoDB with a timeout
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to MongoDB: %w", err)
	}

	// Ping the primary to verify the connection.
	if err := client.Ping(ctx, nil); err != nil {
		// Close the client if ping fails
		client.Disconnect(context.Background()) // Use a background context for disconnect
		return nil, fmt.Errorf("Mongo ping failed: %w", err)
	}

	log.Println("✅ Connected to MongoDB")
	return client, nil
}
