import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';
import { useAuth } from "@clerk/clerk-react";

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial';
import TracksPage from '@/pages/TracksPage';
import ArtistsPage from '@/pages/ArtistsPage';
import AlbumsPage from '@/pages/AlbumsPage';

import { syncUserWithBackend } from '@/features/api/backendApi';
import { initializeAuthToken } from '@/services/selectionApi';

// Main App Content Component (to allow hooks within Router context)
const AppContent: React.FC = () => {
  const { isSignedIn, isLoaded, getToken } = useAuth();
  const [hasSyncedUser, setHasSyncedUser] = useState(false); // Flag for Clerk user sync

  // Initialize the auth token getter immediately
  useEffect(() => {
    initializeAuthToken(getToken);
  }, [getToken]);

  // Effect: Sync Clerk User with Backend & Handle Logout Cleanup
  useEffect(() => {
    const syncUser = async () => {
      if (!isSignedIn || hasSyncedUser) return; // Only sync if signed in and not already synced

      try {
        console.log("Clerk user signed in, attempting to sync with backend...");
        const token = await getToken();
        if (!token) {
            console.warn("Could not get Clerk token for backend sync.");
            return;
        }
        await syncUserWithBackend(token);
        console.log("Backend user sync successful.");
        setHasSyncedUser(true); // Mark sync as complete for this session
      } catch (error) {
        console.error("Failed to sync user with backend:", error);
        // TODO: Implement retry logic or user notification?
      }
    };

    // Trigger sync when Clerk is loaded and user is signed in
    if (isLoaded) {
      syncUser();
    }

    // Cleanup on sign-out
    if (isLoaded && !isSignedIn) {
        console.log("Clerk user signed out, clearing Spotify token and sync status from localStorage.");
        localStorage.removeItem('spotify_access_token');
        // TODO: Optionally clear refresh token if stored elsewhere
        localStorage.removeItem('spotify_auth_status'); // Clear any pending status from localStorage
        localStorage.removeItem('spotify_auth_error_details');
        // Clear pending flags just in case (might be redundant but safe)
        localStorage.removeItem('spotify_code_verifier');

        setHasSyncedUser(false); // Reset sync flag for next sign-in
        // Notify components (like Navbar/HomePage) that Spotify is disconnected
        window.dispatchEvent(new CustomEvent('spotifyAuthExpired')); // Re-use this event name
    }
  }, [isSignedIn, isLoaded, getToken, hasSyncedUser]); // Dependencies

  return (
    <>
      <Navbar />
      <Container maxWidth="lg" sx={{ py: 4, mb: 10 }}> {/* Add bottom margin to prevent overlap with SpeedDial */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/playground" element={<Playground />} />
          {/* TODO: Protect these routes based on isSignedIn */}
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
          {/* TODO: Add a 404 Not Found route */}
        </Routes>
      </Container>
      <NavigationSpeedDial />
    </>
  );
};

// Main App Wrapper
const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    {/* Router needs to be outside AppContent so hooks like useLocation/useNavigate work */}
    <Router>
        <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
