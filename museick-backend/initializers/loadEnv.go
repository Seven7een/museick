package initializers

import (
	"log"

	"github.com/spf13/viper"
)

// Config holds all configuration for the application.
// The values are read by viper from a config file or environment variables.
type Config struct {
	MongoHost     string `mapstructure:"MONGO_HOST"`
	MongoPort     string `mapstructure:"MONGO_PORT"`
	MongoDBName   string `mapstructure:"MONGO_DB_NAME"`
	MongoUser     string `mapstructure:"MONGO_USER"`
	MongoPassword string `mapstructure:"MONGO_PASSWORD"`

	ServerPort   string   `mapstructure:"PORT"`
	ClientOrigin []string `mapstructure:"CLIENT_ORIGIN"` // Frontend URL(s) for CORS

	ClerkSecretKey   string `mapstructure:"CLERK_SECRET_KEY"`
	ClerkFrontendAPI string `mapstructure:"CLERK_FRONTEND_API"`

	SpotifyClientID     string `mapstructure:"SPOTIFY_CLIENT_ID"`
	SpotifyClientSecret string `mapstructure:"SPOTIFY_CLIENT_SECRET"`
	SpotifyRedirectURL  string `mapstructure:"SPOTIFY_REDIRECT_URL"` // URL Spotify redirects to after auth
}

// Global config variable
var config Config

// LoadConfig reads configuration from file or environment variables.
func LoadConfig(path string) (err error) {
	// log.Println("--- Checking ENV VARS directly via os.Getenv ---")
	// log.Printf("os.Getenv(\"MONGO_HOST\"): [%s]", os.Getenv("MONGO_HOST"))
	// log.Printf("os.Getenv(\"PORT\"): [%s]", os.Getenv("PORT"))
	// log.Println("--- End direct ENV VAR check ---")

	viper.AddConfigPath(path)  // Path to look for the config file in
	viper.SetConfigType("env") // REQUIRED if the config file does not have the extension in the name
	viper.SetConfigName("app") // Name of config file (without extension)

	viper.AutomaticEnv() // Read Env variables

	err = viper.ReadInConfig() // Find and read the config file
	if err != nil {
		// Handle errors reading the config file
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			// Config file not found; ignore error if desired and rely solely on ENV vars
			log.Println("Config file 'app.env' not found, relying on environment variables.")

			// Explicitly bind environment variables if file not found
			// This ensures viper knows about the keys even without a file
			keys := []string{
				"MONGO_HOST", "MONGO_PORT", "MONGO_DB_NAME", "MONGO_USER", "MONGO_PASSWORD",
				"PORT", "CLIENT_ORIGIN",
				"CLERK_SECRET_KEY", "CLERK_FRONTEND_API",
				"SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET", "SPOTIFY_REDIRECT_URL",
			}
			for _, key := range keys {
				if bindErr := viper.BindEnv(key); bindErr != nil {
					log.Printf("BindEnv error for %s: %v", key, bindErr)
					// Make bind error fatal as there are no optional vars
					return bindErr
				}
			}
			err = nil // Reset error since file not found is acceptable here
		} else {
			// Config file was found but another error was produced
			log.Printf("Error reading config file: %s", err)
			return
		}
	}

	err = viper.Unmarshal(&config) // Unmarshal config into struct
	if err != nil {
		log.Printf("!!! Viper Unmarshal Error: %v", err)
	} else {
		// Optional: Log loaded config (be careful with secrets)
		log.Printf("--- Config loaded via Viper ---")
		log.Printf("MongoHost: [%s]", config.MongoHost)
		log.Printf("MongoDBName: [%s]", config.MongoDBName)
		log.Printf("ServerPort: [%s]", config.ServerPort)
		// Log the slice of origins
		log.Printf("ClientOrigin: %v", config.ClientOrigin) // Use %v for slice
		log.Printf("ClerkFrontendAPI: [%s]", config.ClerkFrontendAPI)
		// Avoid logging secrets directly
		log.Printf("SpotifyClientID: [%s]", config.SpotifyClientID)
		log.Printf("SpotifyRedirectURL: [%s]", config.SpotifyRedirectURL)
		// log.Printf("SpotifyClientSecret: [REDACTED]")
		// log.Printf("ClerkSecretKey: [REDACTED]")
		log.Printf("--- End Config ---")
	}

	return // Return unmarshal error if any
}

// GetConfig returns the loaded configuration.
func GetConfig() *Config {
	return &config
}
