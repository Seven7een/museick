// src/pages/Home.tsx
import React, { useState, useEffect } from 'react'; // Import useState, useEffect
import { Box, Divider, Snackbar, Alert } from '@mui/material'; // Import Snackbar, Alert
import { useAuth } from "@clerk/clerk-react";

import SpotifySearch from '@/features/spotify/SpotifySearch';
import SpotifyTopSongs from '@/features/spotify/SpotifyTopSongs';

// Define type for severity used by Alert component
type AlertSeverity = 'success' | 'error' | 'info' | 'warning';

const HomePage: React.FC = () => {
  const { isSignedIn } = useAuth(); // Get Clerk authentication state

  // State variables for controlling the Snackbar
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState<AlertSeverity>('info'); // Default severity

  // Effect hook to check for Spotify auth status when the component mounts
  useEffect(() => {
    // Check sessionStorage for the status set by the Callback component
    const status = sessionStorage.getItem('spotify_auth_status');
    // const errorMessage = sessionStorage.getItem('spotify_auth_error'); // Optional: get specific error message

    if (status) {
      // If a status exists, configure and show the Snackbar
      if (status === 'success') {
        setSnackbarMessage('Spotify connected successfully!');
        setSnackbarSeverity('success');
        setSnackbarOpen(true);
      } else if (status === 'error') {
        // Use a generic error message or a specific one if stored
        setSnackbarMessage('Failed to connect Spotify.'); // Or: `Failed to connect Spotify: ${errorMessage || 'Unknown error'}`
        setSnackbarSeverity('error');
        setSnackbarOpen(true);
      }

      // IMPORTANT: Clean up the status flags from sessionStorage
      // This prevents the Snackbar from reappearing on subsequent visits or refreshes
      sessionStorage.removeItem('spotify_auth_status');
      // sessionStorage.removeItem('spotify_auth_error'); // Clean up error message too if used
    }
  }, []); // Empty dependency array ensures this effect runs only once on mount

  // Handler function to close the Snackbar
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    // Prevent closing if the user clicks away (optional)
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false); // Close the Snackbar
  };

  return (
    <Box>
      {/* Spotify Search component */}
      <SpotifySearch />

      {/* Conditionally render Top Songs only if the user is signed in via Clerk */}
      {isSignedIn && (
        <>
          <Divider sx={{ my: 4 }} /> {/* Visual separator */}
          <SpotifyTopSongs />
        </>
      )}

      {/* Snackbar Component for displaying connection status */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000} // Automatically hide after 6 seconds
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }} // Position at bottom-center
      >
        {/* Use MUI Alert component inside Snackbar for better styling and severity icons */}
        <Alert onClose={handleSnackbarClose} severity={snackbarSeverity} sx={{ width: '100%' }}>
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HomePage;
