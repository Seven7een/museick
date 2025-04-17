// src/features/spotify/SpotifyTopSongs.tsx
import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, CircularProgress, Alert,
} from '@mui/material';
import { SpotifyTrackItem } from '@/types/spotify.types'; // Import correct type
import { getMyTopTracks } from '@/features/spotify/spotifyApi'; // Import API function

// Removed internal SpotifyTrack interface, use the one from types

const SpotifyTopSongs: React.FC = () => {
  const [topTracks, setTopTracks] = useState<SpotifyTrackItem[]>([]); // Use imported type
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  // No need for local accessToken state anymore

  // Effect to fetch top tracks
  useEffect(() => {
    // Check if token exists before attempting fetch (optional, API function also checks)
    const tokenExists = !!sessionStorage.getItem('spotify_access_token');
    if (!tokenExists) {
        // Don't try to fetch, maybe show a specific message or rely on API error
        // setError("Connect Spotify to see top tracks."); // Example
        return;
    }

    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        // --- Call API Function ---
        const tracks = await getMyTopTracks('long_term', 5); // Use desired parameters
        setTopTracks(tracks);
      } catch (err: any) {
        console.error("Error fetching top tracks:", err);
        // Error message is now more specific if it's an auth error from the API helper
        setError(err.message || 'Failed to fetch top tracks from Spotify.');
      } finally {
        setLoading(false);
      }
    };

    fetchTracks();

    // No dependency needed here if we only fetch once on mount when token exists
    // If you wanted it to refetch if the token somehow changed *during* the session
    // (unlikely with sessionStorage), you might add a dependency or trigger.
  }, []); // Runs once on mount (if token exists)

  // --- Rendering Logic ---

  // Removed initial check for accessToken state

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading your top tracks...</Typography>
      </Box>
    );
  }

  if (error) {
    // The error might now be "Your Spotify session is invalid..."
    return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  }

  if (!loading && topTracks.length === 0) {
    // Added !loading check for clarity
    return <Typography sx={{ my: 2, textAlign: 'center' }}>No top tracks found or data is still loading.</Typography>;
  }

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Your Top Spotify Tracks (Last ~Year)
      </Typography>
      <List>
        {topTracks.map((track) => (
          <ListItem
            key={track.id}
            component="a"
            href={track.external_urls.spotify}
            target="_blank"
            rel="noopener noreferrer"
            sx={{ mb: 1, bgcolor: 'action.hover', borderRadius: 1 }}
          >
            <ListItemAvatar>
              <Avatar
                variant="square"
                // Use correct path: track.album.images
                src={track.album.images[track.album.images.length - 1]?.url}
                alt={track.name}
              />
            </ListItemAvatar>
            <ListItemText
              primary={track.name}
              secondary={track.artists.map((artist) => artist.name).join(', ')}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SpotifyTopSongs;
