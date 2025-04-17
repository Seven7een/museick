package main

import (
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
// @description This is the backend API for the Museick application.
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
	// TODO: Add defer client.Disconnect(context.Background()) for graceful shutdown

	// --- Dependency Injection ---
	userDAO := dao.NewUserDAO(client, config.MongoDBName, "users")
	// TODO: Instantiate SongDAO
	// songDAO := dao.NewSongDAO(client, config.MongoDBName, "songs")

	userService := services.NewUserService(userDAO)
	// TODO: Instantiate SongService
	// songService := services.NewSongService(songDAO)
	spotifyService := services.NewSpotifyService(config.SpotifyClientID, config.SpotifyClientSecret)

	userHandler := handlers.NewUserHandler(userService)
	// TODO: Instantiate SongHandler
	// songHandler := handlers.NewSongHandler(songService)
	spotifyHandler := handlers.NewSpotifyHandler(spotifyService)
	// --- End Dependency Injection ---

	log.Printf("DEBUG: Configuring CORS with AllowOrigins: %v", []string{config.ClientOrigin})

	server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{config.ClientOrigin}, // Allow frontend origin
		AllowMethods:     []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
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
			if client.Ping(ctx, nil) == nil {
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

		// User Routes
		// TODO: Keep /users POST route if needed for other purposes (e.g., admin creation)
		// api.POST("/users", userHandler.CreateUser)
		// TODO: Keep /users/:id GET route if needed (e.g., fetching profile)
		// api.GET("/users/:id", userHandler.GetUser)

		// User Sync Route (Ensures user exists in DB after Clerk sign-in)
		api.POST("/users/sync", userHandler.SyncUser) // New route for syncing

		// TODO: Uncomment and implement Song routes
		// api.POST("/songs", songHandler.CreateSong)
		// api.GET("/songs/:id", songHandler.GetSong)
		// api.GET("/songs", songHandler.ListSongs)
		// TODO: Add routes for user selections (POST/GET/PUT/DELETE /user-selections)

		// Spotify Routes (Need auth because they interact with user-specific data/tokens)
		api.POST("/spotify/exchange-code", spotifyHandler.ExchangeCodeForToken)
		api.POST("/spotify/refresh-token", spotifyHandler.RefreshAccessToken)
		// TODO: Consider if refresh token endpoint needs better security/design
	}

	log.Printf("🚀 Server starting on port %s", config.ServerPort)
	if err := server.Run(":" + config.ServerPort); err != nil {
		log.Fatal("❌ Server failed to start:", err)
	}
}
