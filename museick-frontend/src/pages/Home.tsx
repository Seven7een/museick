// src/pages/Home.tsx
import React from 'react';
import { Box, Divider } from '@mui/material';
import { useAuth } from "@clerk/clerk-react"; // Import Clerk hook

import SpotifySearch from '@/features/spotify/SpotifySearch';
import SpotifyTopSongs from '@/features/spotify/SpotifyTopSongs';

const HomePage: React.FC = () => {
  const { isSignedIn } = useAuth(); // Get Clerk auth state

  return (
    <Box>
      {/* You can add a title or other general content here if needed */}
      {/* <Typography variant="h4" component="h1" gutterBottom>
        Welcome to Museick
      </Typography> */}

      {/* Include the Spotify Search component */}
      <SpotifySearch />

      {/* Conditionally render the Top Songs component only if user is signed in */}
      {isSignedIn && (
        <>
          <Divider sx={{ my: 4 }} /> {/* Optional: Add a visual separator */}
          <SpotifyTopSongs />
        </>
      )}
    </Box>
  );
};

export default HomePage;
