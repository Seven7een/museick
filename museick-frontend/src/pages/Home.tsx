import React, { useState, useEffect } from 'react';
import { Box, Divider, Snackbar, Alert, Typography, Paper, Button, Collapse, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useAuth } from "@clerk/clerk-react";

import SpotifyTopSongs from '@/features/spotify/SpotifyTopSongs';
import { buildSpotifyAuthUrl } from '@/features/spotify/auth';

type AlertSeverity = 'success' | 'error' | 'info' | 'warning';

const HomePage: React.FC = () => {
  const { isSignedIn } = useAuth();

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
      const token = localStorage.getItem('spotify_access_token');
      setIsSpotifyConnected(!!token);
      // Reset prompt visibility if user logs in and isn't connected
      setShowSpotifyPrompt(!token);
    } else {
      // Clear spotify status if user signs out
      setIsSpotifyConnected(false);
    }
  }, [isSignedIn]); // Re-run when Clerk sign-in status changes

  // Effect hook for the general Snackbar
  useEffect(() => {
    const status = localStorage.getItem('spotify_auth_status');
    const errorDetails = localStorage.getItem('spotify_auth_error_details');
    if (status) {
      if (status === 'success') {
        setSnackbarMessage('Spotify connected successfully!');
        setSnackbarSeverity('success');
        setIsSpotifyConnected(true); // Also update local state
        setShowSpotifyPrompt(false); // Hide prompt on success
      } else if (status === 'error') {
        setSnackbarMessage(`Failed to connect Spotify: ${errorDetails || 'Unknown error'}`);
        setSnackbarSeverity('error');
      }
      setSnackbarOpen(true);
      // Clean up status flags after showing message
      localStorage.removeItem('spotify_auth_status');
      localStorage.removeItem('spotify_auth_error_details');
    }
  }, []); // Runs once on mount to check for redirect status

  // Handler for closing the general Snackbar
  const handleSnackbarClose = (_?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    setSnackbarOpen(false);
  };

  // Handler for initiating Spotify login
  const handleSpotifyLogin = async () => {
    try {
        console.log("Building Spotify Auth URL...");
        const url = await buildSpotifyAuthUrl();
        console.log("Redirecting to:", url);
        window.location.href = url;
    } catch (error) {
        console.error("Error initiating Spotify login:", error);
        // Optionally show an error message to the user
        setSnackbarMessage('Error preparing Spotify login. Check console.');
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
    }
  };

  return (
    <Box>
      {/* Spotify Connection Prompt Alert */}
      {/* Show only if: Signed in via Clerk, NOT connected to Spotify, AND prompt hasn't been dismissed */}
      <Collapse in={isSignedIn && !isSpotifyConnected && showSpotifyPrompt}>
        <Alert
          severity="warning"
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

      {!isSignedIn ? (
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
        <>
          <Typography variant="h4" align="center" gutterBottom>Welcome!</Typography>
          {/* TODO: Add main content for logged-in, connected users */}
          <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 2 }}>
            You're all set! Start selecting your monthly tracks, artists, or albums.
          </Typography>
          <Divider sx={{ my: 4 }} />
          {/* Pass connection status down */}
          <SpotifyTopSongs isConnected={isSpotifyConnected} />
        </>
      ) : (
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

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HomePage;
