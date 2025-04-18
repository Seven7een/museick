package middleware

import (
	"errors"
	"log"
	"net/http"
	"strings"

	"github.com/clerkinc/clerk-sdk-go/clerk"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/seven7een/museick/museick-backend/initializers"
)

// ClerkClientKey is the key used to store the Clerk client in the Gin context.
const ClerkClientKey = "clerkClient"

// ClerkClaimsKey is the key used to store the validated claims in the Gin context.
const ClerkClaimsKey = "clerkClaims"

// ClerkUserIDKey is the key used to store the user's sub (subject) ID in the Gin context.
const ClerkUserIDKey = "userID"

// SetupClerk initializes the Clerk client and adds it to the context.
func SetupClerk() gin.HandlerFunc {
	config := initializers.GetConfig()
	if config.ClerkSecretKey == "" {
		log.Fatal("❌ Clerk Secret Key not configured in environment variables (CLERK_SECRET_KEY)")
	}

	client, err := clerk.NewClient(config.ClerkSecretKey)
	if err != nil {
		log.Fatalf("❌ Failed to initialize Clerk client: %v", err)
	}
	log.Println("✅ Clerk client initialized successfully.")

	return func(c *gin.Context) {
		c.Set(ClerkClientKey, client)
		c.Next()
	}
}

// AuthenticateClerkJWT validates the Clerk JWT from the Authorization header.
func AuthenticateClerkJWT() gin.HandlerFunc {
	return func(c *gin.Context) {
		clerkClientValue, exists := c.Get(ClerkClientKey)
		if !exists {
			log.Println("❌ Clerk client not found in context. Ensure SetupClerk middleware runs first.")
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Server configuration error"})
			return
		}

		client, ok := clerkClientValue.(clerk.Client)
		if !ok {
			log.Println("❌ Invalid Clerk client type in context.")
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Server configuration error"})
			return
		}

		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			log.Println("❌ No Authorization header present")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			log.Printf("❌ Invalid Authorization header format: %s", authHeader)
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}
		sessionToken := parts[1]
		log.Printf("🔍 Attempting to verify token: %s...", sessionToken[:10]) // Show first 10 chars for debugging

		sessClaims, err := client.VerifyToken(sessionToken)
		if err != nil {
			log.Printf("⚠️ Clerk token verification failed: %v\n", err)
			if errors.Is(err, jwt.ErrTokenExpired) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
			} else {
				c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Token verification failed"})
			}
			return
		}

		userID := sessClaims.Subject
		if userID == "" {
			log.Println("❌ Valid Clerk token is missing 'sub' (Subject) claim.")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		log.Printf("✅ Successfully authenticated user: %s", userID)
		c.Set(ClerkClaimsKey, sessClaims)
		c.Set(ClerkUserIDKey, userID)
		c.Next()
	}
}
