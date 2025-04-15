package initializers

import (
	"log"
	"os"

	"github.com/spf13/viper"
)

type Config struct {
	MongoHost     string `mapstructure:"MONGO_HOST"`
	MongoPort     string `mapstructure:"MONGO_PORT"`
	MongoDBName   string `mapstructure:"MONGO_DB_NAME"`
	MongoUser     string `mapstructure:"MONGO_USER"`
	MongoPassword string `mapstructure:"MONGO_PASSWORD"`

	ServerPort   string `mapstructure:"PORT"`
	ClientOrigin string `mapstructure:"CLIENT_ORIGIN"`

	ClerkSecretKey   string `mapstructure:"CLERK_SECRET_KEY"`
	ClerkFrontendAPI string `mapstructure:"CLERK_FRONTEND_API"`

	SpotifyClientID     string `mapstructure:"SPOTIFY_CLIENT_ID"`
	SpotifyClientSecret string `mapstructure:"SPOTIFY_CLIENT_SECRET"`
	SpotifyRedirectURL  string `mapstructure:"SPOTIFY_REDIRECT_URL"`
}

var config Config

func LoadConfig(path string) (err error) {
	log.Println("--- Checking ENV VARS directly via os.Getenv ---")
	log.Printf("os.Getenv(\"MONGO_HOST\"): [%s]", os.Getenv("MONGO_HOST"))
	log.Printf("os.Getenv(\"PORT\"): [%s]", os.Getenv("PORT"))
	log.Println("--- End direct ENV VAR check ---")

	viper.AddConfigPath(path)
	viper.SetConfigType("env")
	viper.SetConfigName("app")

	viper.AutomaticEnv()

	err = viper.ReadInConfig()
	if err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Println("Config file 'app.env' not found, relying on environment variables.")

			keys := []string{
				"MONGO_HOST", "MONGO_PORT", "MONGO_DB_NAME", "MONGO_USER", "MONGO_PASSWORD",
				"PORT", "CLIENT_ORIGIN",
				"CLERK_SECRET_KEY", "CLERK_FRONTEND_API",
				"SPOTIFY_CLIENT_ID", "SPOTIFY_CLIENT_SECRET",
			}
			for _, key := range keys {
				if bindErr := viper.BindEnv(key); bindErr != nil {
					log.Printf("BindEnv error for %s: %v", key, bindErr)
					return bindErr
				}
			}
			err = nil
		} else {
			log.Printf("Error reading config file: %s", err)
			return
		}
	}

	err = viper.Unmarshal(&config)
	if err != nil {
		log.Printf("!!! Viper Unmarshal Error: %v", err)
	} else {
		log.Printf("--- Config loaded via Viper ---")
		log.Printf("MongoHost: [%s]", config.MongoHost)
		log.Printf("MongoDBName: [%s]", config.MongoDBName)
		log.Printf("ServerPort: [%s]", config.ServerPort)
		log.Printf("ClientOrigin: [%s]", config.ClientOrigin)
		log.Printf("ClerkFrontendAPI: [%s]", config.ClerkFrontendAPI)
		log.Printf("SpotifyClientID: [%s]", config.SpotifyClientID)
		log.Printf("SpotifyRedirectURL: [%s]", config.SpotifyRedirectURL)
		log.Printf("SpotifyClientSecret:")
		log.Printf("ClientOrigin: [%s]", config.ClientOrigin)
		log.Printf("--- End Config ---")
	}

	return
}

func GetConfig() *Config {
	return &config
}
