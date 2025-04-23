import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Container, Box } from '@mui/material';
import { useAuth } from "@clerk/clerk-react";

import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial';
import TracksPage from '@/pages/TracksPage';
import ArtistsPage from '@/pages/ArtistsPage';
import AlbumsPage from '@/pages/AlbumsPage';
import PlayerPage from '@/pages/PlayerPage';

import { initializeAuthToken, syncUserWithBackend } from '@/features/api/backendApi';
import { ThemeProvider, useThemeContext } from './context/ThemeContext';

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
      if (!isSignedIn || hasSyncedUser) return;

      try {
        console.log("Clerk user signed in, attempting to sync with backend...");
        await syncUserWithBackend();
        console.log("Backend user sync successful.");
        setHasSyncedUser(true);
      } catch (error) {
        console.error("Failed to sync user with backend:", error);
      }
    };

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

  const { mode } = useThemeContext();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: mode === 'muse'
          ? 'linear-gradient(135deg, #FAFAFA 0%, #FFF1F5 100%)'
          : 'linear-gradient(135deg, #FAFAFA 0%, #F0F7F6 100%)',
        transition: 'background 0.5s ease',
      }}
    >
      <Navbar />
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: 4, 
          mb: 10,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: mode === 'muse'
              ? 'radial-gradient(circle at 0% 0%, rgba(255, 51, 102, 0.05) 0%, transparent 50%)'
              : 'radial-gradient(circle at 100% 0%, rgba(42, 157, 143, 0.05) 0%, transparent 50%)',
            transition: 'background 0.5s ease',
            pointerEvents: 'none',
          }
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/playground" element={<Playground />} />
{/* TODO: Protect these routes based on isSignedIn */}
          <Route path="/tracks/:year?" element={<TracksPage />} />
          <Route path="/artists/:year?" element={<ArtistsPage />} />
          <Route path="/albums/:year?" element={<AlbumsPage />} />
          <Route path="/player" element={<PlayerPage />} />
{/* TODO: Add a 404 Not Found route */}
        </Routes>
      </Container>
      <NavigationSpeedDial />
    </Box>
  );
};

// Main App Wrapper
const App: React.FC = () => (
  <ThemeProvider>
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
