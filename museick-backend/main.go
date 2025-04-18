package main

import (
	"context" // Add context import
	"log"
	"net/http"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/seven7een/museick/museick-backend/initializers"
	"github.com/seven7een/museick/museick-backend/internal/dao"
	"github.com/seven7een/museick/museick-backend/internal/handlers"
	"github.com/seven7een/museick/museick-backend/internal/services"
	"github.com/seven7een/museick/museick-backend/middleware"

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/seven7een/museick/museick-backend/docs" // Gin-Swagger docs
)

var server *gin.Engine

// init runs before main() to load configuration and set up the Gin engine.
func init() {
	err := initializers.LoadConfig(".") // Load .env file from current directory
	if err != nil {
		log.Fatal("❌ Could not load environment variables:", err)
	}
	server = gin.Default() // Initialize Gin engine
}

// @title Museick API
// @version 1.0
// @description This is the backend API for the Museick application. It manages user data, Spotify interactions, and Muse/Ick selections.
// @termsOfService http://swagger.io/terms/

// @contact.name API Support
// @contact.url http://www.swagger.io/support
// @contact.email support@swagger.io

// @license.name Apache 2.0
// @license.url http://www.apache.org/licenses/LICENSE-2.0.html

// @host localhost:8080
// @BasePath /
// @schemes http https

// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
// @description Type "Bearer" followed by a space and JWT token.
func main() {
	config := initializers.GetConfig()

	client, err := initializers.NewMongoConnection(config)
	if err != nil {
		log.Fatal("❌ Could not connect to MongoDB:", err)
	}
	// Add defer client.Disconnect for graceful shutdown
	defer func() {
		if err = client.Disconnect(context.Background()); err != nil {
			log.Printf("Error disconnecting from MongoDB: %v", err)
		} else {
			log.Println("MongoDB connection closed.")
		}
	}()

	// --- Dependency Injection ---
	// Core DAOs
	userDAO := dao.NewUserDAO(client, config.MongoDBName, "users")
	spotifyTrackDAO := dao.NewSpotifyTrackDAO(client, config.MongoDBName, "spotify_tracks") // Use Track DAO
	spotifyAlbumDAO := dao.NewSpotifyAlbumDAO(client, config.MongoDBName, "spotify_albums")
	spotifyArtistDAO := dao.NewSpotifyArtistDAO(client, config.MongoDBName, "spotify_artists")
	userSelectionDAO := dao.NewUserSelectionDAO(client, config.MongoDBName, "user_selections")

	// Core Services
	userService := services.NewUserService(userDAO)
	spotifyService := services.NewSpotifyService(config.SpotifyClientID, config.SpotifyClientSecret)                                // Handles basic auth, token exchange
	spotifySyncService := services.NewSpotifySyncService(spotifyTrackDAO, spotifyAlbumDAO, spotifyArtistDAO /*, spotifyService */) // Inject Track DAO
	userSelectionService := services.NewUserSelectionService(userSelectionDAO, spotifySyncService, spotifyService)                 // Pass DAOs and other services

	// Handlers
	userHandler := handlers.NewUserHandler(userService)
	spotifyHandler := handlers.NewSpotifyHandler(spotifyService)           // Handles auth code exchange, refresh etc.
	selectionHandler := handlers.NewSelectionHandler(userSelectionService) // Handles POST/GET/PUT/DELETE on /selections

	// --- End Dependency Injection ---

	log.Printf("DEBUG: Configuring CORS with AllowOrigins: %v", []string{config.ClientOrigin})

	server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{config.ClientOrigin}, // Allow frontend origin
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization", "x-spotify-token"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Apply Clerk client setup middleware globally
	server.Use(middleware.SetupClerk())

	// --- Public Routes ---
	router := server.Group("/")
	{
		router.GET("/", func(ctx *gin.Context) {
			ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "Welcome to Museick API"})
		})
		router.GET("/ping", func(ctx *gin.Context) { ctx.JSON(http.StatusOK, "pong") })
		// TODO: Implement a more robust DB health check
		router.GET("/db_health", func(ctx *gin.Context) {
			// Use a timeout context for the ping
			pingCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			if client.Ping(pingCtx, nil) == nil {
				ctx.JSON(http.StatusOK, gin.H{"status": "MongoDB connection healthy"})
			} else {
				ctx.JSON(http.StatusInternalServerError, gin.H{"status": "MongoDB connection unhealthy"})
			}
		})
		// Swagger documentation route
		url := ginSwagger.URL("/swagger/doc.json") // The url pointing to API definition
		router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, url))
	}

	// --- API Routes (Protected by Clerk JWT Authentication) ---
	api := router.Group("/api")
	{
		// Apply Clerk JWT authentication middleware to all /api routes
		api.Use(middleware.AuthenticateClerkJWT())

		// User Sync Route (Ensures user exists in DB after Clerk sign-in)
		api.POST("/users/sync", userHandler.SyncUser)

		// User Selection Routes (New)
		api.POST("/selections", selectionHandler.CreateSelection)                 // Add a candidate/muse/ick
		api.GET("/selections/:monthYear", selectionHandler.ListSelectionsByMonth) // List selections for a month (YYYY-MM)
		api.PUT("/selections/:id", selectionHandler.UpdateSelection)              // Update a selection (e.g., change type, notes)
		api.DELETE("/selections/:id", selectionHandler.DeleteSelection)           // Delete a selection

		// Spotify Auth Routes (Need auth because they interact with user-specific data/tokens)
		api.POST("/spotify/exchange-code", spotifyHandler.ExchangeCodeForToken) // Exchanges auth code for user tokens
		api.POST("/spotify/refresh-token", spotifyHandler.RefreshAccessToken)   // Refreshes user's access token
		// TODO: Consider if refresh token endpoint needs better security/design
	}

	log.Printf("🚀 Server starting on port %s", config.ServerPort)
	if err := server.Run(":" + config.ServerPort); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
