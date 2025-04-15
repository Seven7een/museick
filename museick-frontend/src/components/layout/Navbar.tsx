// src/components/layout/Navbar.tsx
import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { buildSpotifyAuthUrl } from '@/features/spotify/auth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle'; // Icon for connected state
import LinkOffIcon from '@mui/icons-material/LinkOff'; // Optional: Icon for disconnect on hover/focus

const Navbar: React.FC = () => {
  // State to track if Spotify access token exists in sessionStorage
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);

  // Effect to manage Spotify connection status and listen for updates
  useEffect(() => {
    // Function to check the current token status in sessionStorage
    const checkToken = () => {
      const token = sessionStorage.getItem('spotify_access_token');
      setIsSpotifyConnected(!!token); // Update state based on token presence
    };

    // Initial check when the component mounts
    checkToken();

    // Define the handler for the custom 'spotifyAuthSuccess' event
    // This event is dispatched by the Callback component upon successful token exchange
    const handleAuthSuccess = () => {
      console.log('Navbar received spotifyAuthSuccess event, updating state.');
      setIsSpotifyConnected(true); // Update state without needing a page reload
    };

    // Add event listener to listen for successful Spotify connection
    window.addEventListener('spotifyAuthSuccess', handleAuthSuccess);

    // Cleanup function: Remove the event listener when the component unmounts
    // This prevents memory leaks
    return () => {
      window.removeEventListener('spotifyAuthSuccess', handleAuthSuccess);
    };
  }, []); // Empty dependency array: setup listener and initial check only once on mount

  // Function to initiate the Spotify authorization flow
  const handleSpotifyLogin = async () => {
    const url = await buildSpotifyAuthUrl(); // Build the Spotify auth URL
    window.location.href = url; // Redirect the user to Spotify
  };

  // Function to handle disconnecting Spotify
  const handleSpotifyDisconnect = () => {
    console.log('Disconnecting Spotify...');
    // Remove the token from session storage
    sessionStorage.removeItem('spotify_access_token');
    // Update the local state (though reload will reset it anyway)
    setIsSpotifyConnected(false);
    // Optionally notify backend or perform other cleanup if needed
    // Refresh the page to ensure all components reflect the change
    window.location.reload();
  };

  return (
    <AppBar position="static">
      <Toolbar>
        {/* App Title */}
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Museick</Typography>

        {/* Right-aligned items */}
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {/* Content shown when user is signed OUT */}
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outlined" color="inherit" sx={{ ml: 1 }}>
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          {/* Content shown when user is signed IN */}
          <SignedIn>
            {/* Conditionally render Spotify button OR connected indicator */}
            {!isSpotifyConnected ? (
              // Show "Connect Spotify" button if token is NOT present
              <Button color="inherit" onClick={handleSpotifyLogin} sx={{ mr: 2 }}>
                Connect Spotify
              </Button>
            ) : (
              // Show an indicator chip if token IS present, make it clickable
              <Chip
                icon={<CheckCircleIcon />}
                label="Spotify Connected"
                color="success"
                variant="outlined"
                size="small"
                // Add onClick handler to trigger disconnect
                onClick={handleSpotifyDisconnect}
                // Add styling to indicate it's clickable
                sx={{
                  mr: 2,
                  color: 'white',
                  borderColor: 'rgba(255, 255, 255, 0.7)',
                  cursor: 'pointer', // Make cursor a pointer on hover
                  '&:hover': { // Optional: Change appearance on hover
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    // You could even change the icon/label on hover if desired
                  },
                  '&:focus': { // Accessibility improvement
                     backgroundColor: 'rgba(255, 255, 255, 0.15)',
                  }
                }}
                // Optional: Add a tooltip for clarity
                title="Click to disconnect Spotify"
              />
            )}

            {/* Clerk User Button (manage profile, sign out) */}
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
