package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// VerifyClerkSession verifies that the user's Clerk session is valid.
func VerifyClerkSession() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Placeholder for Clerk session verification logic
		// You can replace this with actual logic using Clerk SDK or your session management system
		// For example, you may check a cookie or a session header here.
		if !isValidClerkSession(c) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}

// AttachUserFromClerk attaches the user to the context based on Clerk session
func AttachUserFromClerk() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Fetch the user from Clerk based on session or token
		userID := getUserIDFromClerkSession(c) // Replace this with actual logic

		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			c.Abort()
			return
		}

		// You can retrieve the user from DB here if needed
		c.Set("userID", userID)
		c.Next()
	}
}

// Placeholder function to simulate checking Clerk session validity
func isValidClerkSession(c *gin.Context) bool {
	// Implement the actual check (e.g., checking the Clerk JWT or session cookie)
	return true
}

// Placeholder function to simulate fetching the user ID from Clerk session
func getUserIDFromClerkSession(c *gin.Context) string {
	// Implement the actual logic to get the user ID from Clerk's session (e.g., Clerk JWT)
	return "sample-user-id" // Example user ID
}
