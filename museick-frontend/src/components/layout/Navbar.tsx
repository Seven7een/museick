import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AppBar, Toolbar, Typography, Box, Button, Chip } from '@mui/material';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { buildSpotifyAuthUrl } from '@/features/spotify/auth';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import SpotifyIcon from '@mui/icons-material/Link';

const Navbar: React.FC = () => {
  // State to track if Spotify access token exists in sessionStorage
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  // State to track hover status of the Spotify chip
  const [isChipHovered, setIsChipHovered] = useState(false);

  // Effect to manage Spotify connection status and listen for updates
  useEffect(() => {
    // Function to check the current token status in sessionStorage
    const checkToken = () => {
      const token = localStorage.getItem('spotify_access_token');
      setIsSpotifyConnected(!!token); // Update state based on token presence
    };

    // Initial check when the component mounts
    checkToken();

    // Define the handler for the custom 'spotifyAuthSuccess' event
    const handleAuthSuccess = () => {
      console.log('Navbar received spotifyAuthSuccess event, updating state.');
      setIsSpotifyConnected(true);
    };

    window.addEventListener('spotifyAuthSuccess', handleAuthSuccess);

    // Cleanup function
    return () => {
      window.removeEventListener('spotifyAuthSuccess', handleAuthSuccess);
    };
  }, []);

  // Function to initiate the Spotify authorization flow
  const handleSpotifyLogin = async () => {
    const url = await buildSpotifyAuthUrl();
    window.location.href = url;
  };

  // Function to handle disconnecting Spotify
  const handleSpotifyDisconnect = () => {
    console.log('Disconnecting Spotify...');
    localStorage.removeItem('spotify_access_token');
    setIsSpotifyConnected(false);
    window.location.reload(); // Reload to reflect changes everywhere
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{
            flexGrow: 1,
            color: 'inherit',
            textDecoration: 'none',
            '&:hover': { opacity: 0.9 }
          }}
        >
          Museick
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outlined" color="inherit" sx={{ ml: 1 }}>
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>

          <SignedIn>
            {/* Conditionally render Spotify button OR connected indicator */}
            {!isSpotifyConnected ? (
              <Chip
                icon={<SpotifyIcon />}
                label="Connect Spotify"
                variant="outlined"
                size="small"
                onClick={handleSpotifyLogin}
                sx={{
                  mr: 2,
                  color: 'white', // Default text color
                  borderColor: 'rgba(255, 255, 255, 0.7)', // Default border
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out', // Added color transition
                  '& .MuiChip-icon': { // Style the icon color
                      color: '#1DB954', // Spotify green icon always
                      transition: 'color 0.2s ease-in-out', // Smooth icon color transition (though it stays green here)
                  },
                  '&:hover': {
                    color: 'white', // Keep text white on hover
                    backgroundColor: 'rgba(29, 185, 84, 0.1)', // Light Spotify green background
                    borderColor: 'rgba(29, 185, 84, 0.9)', // Brighter Spotify green border
                  },
                  '&:focus': { // Accessibility focus style
                     backgroundColor: 'rgba(29, 185, 84, 0.15)',
                     borderColor: 'rgba(29, 185, 84, 0.9)',
                  }
                }}
                title="Connect your Spotify account"
              />
            ) : (
              <Chip
                icon={isChipHovered ? <LinkOffIcon /> : <CheckCircleIcon />}
                label={isChipHovered ? 'Disconnect Spotify' : 'Spotify Connected'}
                // Use sx for dynamic colors instead of 'color' prop for more control
                // color={isChipHovered ? 'error' : 'success'} // Removed this
                variant="outlined"
                size="small"
                onClick={handleSpotifyDisconnect}
                onMouseEnter={() => setIsChipHovered(true)}
                onMouseLeave={() => setIsChipHovered(false)}
                sx={{
                  mr: 2,
                  cursor: 'pointer',
                  transition: 'background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out',
                  // Default (Connected) State - Greenish
                  color: 'white',
                  borderColor: isChipHovered ? 'rgba(211, 47, 47, 0.7)' : 'rgba(46, 125, 50, 0.7)', // Reddish border on hover, Greenish otherwise
                  backgroundColor: isChipHovered ? 'rgba(211, 47, 47, 0.1)' : 'rgba(46, 125, 50, 0.1)', // Reddish background on hover, Greenish otherwise
                  '& .MuiChip-icon': {
                    color: isChipHovered ? 'rgba(211, 47, 47, 0.9)' : 'rgba(46, 125, 50, 0.9)', // Reddish icon on hover, Greenish otherwise
                    transition: 'color 0.2s ease-in-out',
                  },
                  // Hover (Disconnect) State - Reddish
                  '&:hover': {
                     backgroundColor: 'rgba(211, 47, 47, 0.2)',
                     borderColor: 'rgba(211, 47, 47, 0.9)',
                  }
                }}
                title="Click to disconnect Spotify"
              />
            )}

            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
