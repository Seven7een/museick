// src/components/layout/Navbar.tsx
import React from 'react';
import { AppBar, Toolbar, Typography, Box, Button } from '@mui/material';
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/clerk-react";
import { buildSpotifyAuthUrl } from '@/features/spotify/auth';

const Navbar: React.FC = () => {
  const handleSpotifyLogin = async () => {
    const url = await buildSpotifyAuthUrl();
    window.location.href = url;
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>Museick</Typography>
        <Button color="inherit" onClick={handleSpotifyLogin}>Connect Spotify</Button>
        <Box>
          <SignedOut>
            <SignInButton mode="modal">
              <Button variant="outlined" color="inherit" sx={{ ml: 1 }}>
                Sign In
              </Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
