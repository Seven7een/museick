// src/pages/Home.tsx
import React, { useState, useEffect } from 'react';
import { Box, Divider, Snackbar, Alert, Typography, Paper, Button, Collapse, IconButton } from '@mui/material'; // Added Collapse, IconButton
import CloseIcon from '@mui/icons-material/Close'; // Icon for dismissing alert
import { useAuth, SignInButton } from "@clerk/clerk-react";

import SpotifyTopSongs from '@/features/spotify/SpotifyTopSongs';
import { buildSpotifyAuthUrl } from '@/features/spotify/auth'; // Import function to build auth URL

type AlertSeverity = 'success' | 'error' | 'info' | 'warning';

const HomePage: React.FC = () => {
  const { isSignedIn } = useAuth(); // Clerk auth state

  // State for Spotify connection status
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  // State for showing/hiding the Spotify connection prompt alert
  const [showSpotifyPrompt, setShowSpotifyPrompt] = useState(true);

  // State for the general Snackbar (connection success/failure)
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertSeverity>('info');

  // Effect to check Spotify token status on mount and when sign-in status changes
  useEffect(() => {
    if (isSignedIn) {
      const token = sessionStorage.getItem('spotify_access_token');
      setIsSpotifyConnected(!!token);
      // Reset prompt visibility if user logs in and isn't connected
      setShowSpotifyPrompt(!token);
    } else {
      // Clear spotify status if user signs out
      setIsSpotifyConnected(false);
    }
  }, [isSignedIn]); // Re-run when Clerk sign-in status changes

  // Effect hook for the general Snackbar (remains the same)
  useEffect(() => {
    const status = sessionStorage.getItem('spotify_auth_status');
    if (status) {
      if (status === 'success') {
        setSnackbarMessage('Spotify connected successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
        setIsSpotifyConnected(true); // Also update local state
        setShowSpotifyPrompt(false); // Hide prompt on success
      } else if (status === 'error') {
        setSnackbarMessage('Failed to connect Spotify.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }
      sessionStorage.removeItem('spotify_auth_status');
    }
  }, []); // Runs once on mount

  // Handler for closing the general Snackbar
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Handler for initiating Spotify login
  const handleSpotifyLogin = async () => {
    const url = await buildSpotifyAuthUrl();
    window.location.href = url;
  };

  return (
    <Box>
      {/* --- Spotify Connection Prompt Alert --- */}
      {/* Show only if: Signed in via Clerk, NOT connected to Spotify, AND prompt hasn't been dismissed */}
      <Collapse in={isSignedIn && !isSpotifyConnected && showSpotifyPrompt}>
        <Alert
          severity="warning" // Or "info"
          sx={{ mb: 2 }}
          action={
            <>
              <Button color="inherit" size="small" onClick={handleSpotifyLogin}>
                Connect Now
              </Button>
              <IconButton
                aria-label="close prompt"
                color="inherit"
                size="small"
                onClick={() => {
                  setShowSpotifyPrompt(false); // Dismiss the prompt
                }}
              >
                <CloseIcon fontSize="inherit" />
              </IconButton>
            </>
          }
        >
          This site is much better with Spotify integration! Please connect your Spotify account.
        </Alert>
      </Collapse>

      {/* --- Main Content Area --- */}
      {!isSignedIn ? (
        // --- Content for Signed-Out Users ---
        <Paper elevation={2} sx={{ p: 4, mt: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            See Your Spotify Insights
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Sign in with the button in the top right to view your top tracks and manage your monthly Muses & Icks!
          </Typography>
          {/* Optional redundant button: */}
          {/* <SignInButton mode="modal"><Button variant="contained">Sign In</Button></SignInButton> */}
        </Paper>
      ) : isSpotifyConnected ? (
        // --- Content for Signed-In Users WITH Spotify Connected ---
        <>
          <Typography variant="h4" align="center" gutterBottom>Welcome!</Typography>
          <Divider sx={{ my: 4 }} />
          <SpotifyTopSongs />
        </>
      ) : (
        // --- Content for Signed-In Users WITHOUT Spotify Connected (Prompt might be hidden) ---
        <Box sx={{ textAlign: 'center', mt: 4, p: 2 }}>
           <Typography variant="h5" gutterBottom>Welcome!</Typography>
           <Typography variant="body1" color="text.secondary">
             Connect your Spotify account to see your top tracks and start curating your Muses & Icks.
           </Typography>
           {/* Optionally add a button here too if the alert is dismissed */}
           {!showSpotifyPrompt && (
              <Button variant="outlined" onClick={handleSpotifyLogin} sx={{ mt: 2 }}>
                Connect Spotify
              </Button>
           )}
        </Box>
      )}

      {/* General Snackbar Component */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HomePage;
