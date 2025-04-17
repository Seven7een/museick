// src/App.tsx
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom'; // Import useLocation, useNavigate
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import { useAuth } from "@clerk/clerk-react"; // Import useAuth

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback'; // Still needed for the route definition
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial';
import TracksPage from '@/pages/TracksPage';
import ArtistsPage from '@/pages/ArtistsPage';
import AlbumsPage from '@/pages/AlbumsPage';

// Import backend API functions that require JWT
import { syncUserWithBackend, exchangeSpotifyCode } from '@/features/api/backendApi';

// --- Main App Content Component (to use hooks) ---
const AppContent: React.FC = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [hasSyncedUser, setHasSyncedUser] = useState(false); // Flag for Clerk user sync
  const location = useLocation(); // Hook to get current URL info
  const navigate = useNavigate(); // Hook to navigate programmatically

  // --- Effect 1: Sync Clerk User & Handle Logout Cleanup ---
  useEffect(() => {
    const syncUser = async () => {
      try {
        console.log("Clerk user signed in, attempting to sync with backend...");
        const token = await getToken(); // Get token inside effect
        if (!token) {
            console.warn("Could not get Clerk token for backend sync.");
            return;
        }
        await syncUserWithBackend(token); // Pass token
        console.log("Backend user sync successful.");
        setHasSyncedUser(true);
      } catch (error) {
        console.error("Failed to sync user with backend:", error);
      }
    };

    // Sync on sign-in
    if (isLoaded && isSignedIn && !hasSyncedUser) {
      syncUser();
    }

    // Cleanup on sign-out
    if (isLoaded && !isSignedIn) {
        console.log("Clerk user signed out, clearing Spotify token and sync status.");
        sessionStorage.removeItem('spotify_access_token');
        // Optionally clear refresh token if stored elsewhere
        // sessionStorage.removeItem('spotify_refresh_token');
        sessionStorage.removeItem('spotify_auth_status'); // Clear any pending status
        sessionStorage.removeItem('spotify_auth_error_details');
        // Clear pending flags just in case
        sessionStorage.removeItem('spotify_pending_code');
        sessionStorage.removeItem('spotify_pending_verifier');
        localStorage.removeItem('spotify_code_verifier');

        setHasSyncedUser(false); // Reset sync flag
        // Notify components (like Navbar/HomePage) that Spotify is disconnected
        window.dispatchEvent(new CustomEvent('spotifyAuthExpired')); // Re-use this event name
    }
  }, [isSignedIn, isLoaded, getToken, hasSyncedUser]); // Dependencies

  // --- Effect 2: Process Pending Spotify Auth ---
  useEffect(() => {
    const processSpotifyAuth = async () => {
      const params = new URLSearchParams(location.search);
      const needsProcessing = params.get('spotify_auth') === 'pending';
      const code = sessionStorage.getItem('spotify_pending_code');
      const verifier = sessionStorage.getItem('spotify_pending_verifier');

      // Function to clean up temporary storage and URL param
      const cleanup = () => {
          sessionStorage.removeItem('spotify_pending_code');
          sessionStorage.removeItem('spotify_pending_verifier');
          localStorage.removeItem('spotify_code_verifier'); // Clean original storage too
          // Remove query param from URL without reloading page
          navigate(location.pathname, { replace: true });
      };

      // Proceed only if processing is needed, code/verifier exist, and Clerk is ready and user is signed in
      if (needsProcessing && code && verifier && isLoaded && isSignedIn) {
        console.log("Processing pending Spotify auth...");
        try {
          const jwt = await getToken(); // Get Clerk token now that user is signed in
          if (!jwt) {
            // This case should be rare if isSignedIn is true, but handle defensively
            throw new Error("Clerk token unavailable for Spotify exchange despite being signed in.");
          }

          // Call backend API to exchange code, passing the JWT
          const tokenData = await exchangeSpotifyCode(code, verifier, jwt);

          console.log('Spotify token exchange successful via backend:', tokenData);
          sessionStorage.setItem('spotify_access_token', tokenData.access_token);
          // TODO: Store refresh token securely if needed
          sessionStorage.setItem('spotify_auth_status', 'success'); // Set success status for Snackbar on HomePage
          window.dispatchEvent(new CustomEvent('spotifyAuthSuccess')); // Notify Navbar etc.

        } catch (error: any) {
          console.error("Error during Spotify token exchange (via backend):", error);
          sessionStorage.setItem('spotify_auth_status', 'error');
          sessionStorage.setItem('spotify_auth_error_details', error.message || 'Failed to exchange Spotify code.');
          // Snackbar on HomePage will show the error
        } finally {
          cleanup(); // Clean up storage and URL param in all cases (success or failure)
        }
      } else if (needsProcessing) {
          // If URL has 'pending' but conditions aren't met (e.g., user signed out before processing)
          console.warn("Spotify auth pending but prerequisites not met (e.g., not signed in, missing code). Cleaning up.");
          sessionStorage.setItem('spotify_auth_status', 'error');
          sessionStorage.setItem('spotify_auth_error_details', 'Spotify login process could not be completed.');
          cleanup(); // Clean up anyway
      }
    };

    processSpotifyAuth();
  // Depend on location search, loaded status, signed-in status, and token function
  }, [location.search, isLoaded, isSignedIn, getToken, navigate]);


  return (
    <> {/* Use Fragment */}
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4, mb: 10 }}>
        <Routes>
          {/* Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} /> {/* Route definition still needed */}
          <Route path="/playground" element={<Playground />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
        </Routes>
      </Container>
      <NavigationSpeedDial />
    </>
  );
};

// --- Main App Wrapper ---
const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {/* Router needs to be outside AppContent so hooks like useLocation work */}
    <Router>
        <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
