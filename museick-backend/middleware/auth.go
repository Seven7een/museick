package middleware

import (
	"context" // Added context import (might be needed if you uncomment session check)
	"fmt"     // Added fmt import (might be needed if you uncomment session check)
	"log"
	"net/http"
	"strings"
	"time" // Added time import (might be needed if you uncomment session check)

	"github.com/clerkinc/clerk-sdk-go/clerk"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5" // Ensure this package is downloaded via 'go mod tidy'
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
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer {token}"})
			return
		}
		sessionToken := parts[1]

		sessClaims, err := client.VerifyToken(sessionToken)
		if err != nil {
			log.Printf("⚠️ Clerk token verification failed: %v\n", err)

			// Check if the error is specifically a JWT validation error
			// This line requires 'go mod tidy' to have run successfully
			if tokenErr, ok := err.(*jwt.ValidationError); ok && tokenErr.Is(jwt.ErrTokenExpired) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token has expired"})
			} else {
				// Handle other verification errors (invalid signature, etc.)
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			}
			return
		}

		// Optional: Check if session is active via Clerk API
		// session, err := client.Sessions().Read(sessClaims.SessionID)
		// if err != nil || session.Status != clerk.SessionStatusActive {
		//  log.Printf("⚠️ Clerk session %s is not active or lookup failed: %v\n", sessClaims.SessionID, err)
		// 	c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Session is not active"})
		// 	return
		// }

		userID := sessClaims.Subject
		if userID == "" {
			log.Println("❌ Valid Clerk token is missing 'sub' (Subject) claim.")
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		c.Set(ClerkClaimsKey, sessClaims)
		c.Set(ClerkUserIDKey, userID)

		// Log successful authentication (optional)
		// log.Printf("✅ User %s authenticated successfully.\n", userID)

		c.Next()
	}
}
