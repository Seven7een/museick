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

	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	_ "github.com/seven7een/museick/museick-backend/docs"
)

var server *gin.Engine

func init() {
	// Load env
	err := initializers.LoadConfig(".")
	if err != nil {
		log.Fatal("❌ Could not load environment variables:", err)
	}

	// Set up Gin
	server = gin.Default()
}

func main() {
	config := initializers.GetConfig()

	// Mongo connection
	client, err := initializers.NewMongoConnection(config)
	if err != nil {
		log.Fatal("❌ Could not connect to MongoDB:", err)
	}

	// DAOs
	userDAO := dao.NewUserDAO(client, config.MongoDBName, "users")
	songDAO := dao.NewSongDAO(client, config.MongoDBName, "songs")

	// Services
	userService := services.NewUserService(userDAO)
	songService := services.NewSongService(songDAO)
	spotifyService := services.NewSpotifyService(config.SpotifyClientID, config.SpotifyClientSecret)

	// Handlers
	userHandler := handlers.NewUserHandler(userService)
	songHandler := handlers.NewSongHandler(songService)
	spotifyHandler := handlers.NewSpotifyHandler(spotifyService)

	log.Printf("DEBUG: Configuring CORS with AllowOrigins: %v", []string{config.ClientOrigin})

	// CORS setup
	server.Use(cors.New(cors.Config{
		AllowOrigins:     []string{config.ClientOrigin},
		AllowMethods:     []string{"GET", "PUT", "POST", "PATCH", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Router setup
	router := server.Group("/")
	router.GET("/", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "success", "message": "Welcome to Museick API"})
	})

	router.GET("/ping", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, "pong")
	})

	router.GET("/db_health", func(ctx *gin.Context) {
		ctx.JSON(http.StatusOK, gin.H{"status": "MongoDB connection healthy"})
	})

	// API Routes
	api := router.Group("/api")
	{
		// api.Use(middleware.VerifyClerkSession())
		// api.Use(middleware.AttachUserFromClerk())

		// User Routes
		api.POST("/users", userHandler.CreateUser)
		api.GET("/users/:id", userHandler.GetUser)

		// Song Routes
		api.POST("/songs", songHandler.CreateSong)
		api.GET("/songs/:id", songHandler.GetSong)
		api.GET("/songs", songHandler.ListSongs)

		// Spotify Routes
		api.POST("/spotify/exchange-code", spotifyHandler.ExchangeCodeForToken)
		api.POST("/spotify/refresh-token", spotifyHandler.RefreshAccessToken)
	}

	// Swagger setup
	url := ginSwagger.URL("http://localhost:8080/swagger/doc.json")
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler, url))

	// Start server
	log.Fatal(server.Run(":" + config.ServerPort))
}
