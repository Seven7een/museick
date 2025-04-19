import React, { useState, useEffect } from 'react';
import {
  Box, Typography, List, ListItem, ListItemText, ListItemAvatar,
   Avatar, CircularProgress, Alert,
 } from '@mui/material';
 import { useAuth } from '@clerk/clerk-react';
 import { SpotifyTrackItem } from '@/types/spotify.types';
 import { getMyTopTracks } from '@/features/spotify/spotifyApi';

 interface SpotifyTopSongsProps {
  isConnected: boolean; // Receive connection status from parent
}

 const SpotifyTopSongs: React.FC<SpotifyTopSongsProps> = ({ isConnected }) => {
   const { getToken } = useAuth();
   const [topTracks, setTopTracks] = useState<SpotifyTrackItem[]>([]);
   const [loading, setLoading] = useState<boolean>(false);
   const [error, setError] = useState<string | null>(null);

   useEffect(() => {
    // Only fetch if the parent component confirms connection
    if (!isConnected) {
        // Optionally clear previous tracks if connection is lost
        // setTopTracks([]);
        // setError(null);
        return;
    }

    const fetchTracks = async () => {
      setLoading(true);
       setError(null);
       try {
         const tracks = await getMyTopTracks('long_term', 5, getToken);
         setTopTracks(tracks);
       } catch (err: any) {
        console.error("Error fetching top tracks:", err);
        setError(err.message || 'Failed to fetch top tracks from Spotify.');
      } finally {
        setLoading(false);
      }
     };

     fetchTracks();
     // Re-run effect if isConnected status changes or getToken changes (though unlikely)
   }, [isConnected, getToken]);

   // If not connected, don't show loading/error/empty states related to fetching
  if (!isConnected) {
    return null; // Or some placeholder indicating connection is needed
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" my={4}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading your top tracks...</Typography>
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  }

  if (!loading && topTracks.length === 0) {
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
