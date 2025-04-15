// src/features/spotify/SpotifyTopSongs.tsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  CircularProgress,
  Alert,
} from '@mui/material';

// Define the structure of a Spotify track item based on the API response
interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string; height: number; width: number }[];
  };
  external_urls: {
    spotify: string;
  };
}

const SpotifyTopSongs: React.FC = () => {
  const [topTracks, setTopTracks] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  // Effect to retrieve the token from sessionStorage on component mount
  useEffect(() => {
    const token = sessionStorage.getItem('spotify_access_token');
    if (token) {
      setAccessToken(token);
    } else {
      // Optional: Handle case where token is not found immediately
      console.log("Spotify access token not found in sessionStorage.");
      // Might want to set an error or display a message prompting login
      // setError("Please log in with Spotify to see your top tracks.");
    }
  }, []); // Empty dependency array ensures this runs only once on mount

  // Effect to fetch top tracks when the access token is available
  useEffect(() => {
    if (!accessToken) {
      return; // Don't fetch if we don't have a token
    }

    const fetchTopTracks = async () => {
      setLoading(true);
      setError(null); // Clear previous errors

      try {
        // Use the fetch logic adapted from the Spotify example
        const endpoint = 'v1/me/top/tracks?time_range=long_term&limit=5';
        const method = 'GET';

        const res = await fetch(`https://api.spotify.com/${endpoint}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`, // Use the token from state
          },
          method,
        });

        if (!res.ok) {
          // Handle non-successful responses (e.g., 401 Unauthorized, 403 Forbidden)
          let errorMsg = `Spotify API Error: ${res.status} ${res.statusText}`;
          try {
            const errorBody = await res.json();
            errorMsg = errorBody?.error?.message || errorMsg;
          } catch (e) {
            // Ignore if error body parsing fails
          }
          throw new Error(errorMsg);
        }

        const data = await res.json();

        if (!data.items) {
          throw new Error("Invalid response structure from Spotify API");
        }

        setTopTracks(data.items as SpotifyTrack[]);

      } catch (err: any) {
        console.error("Error fetching top tracks:", err);
        setError(err.message || 'Failed to fetch top tracks from Spotify.');
        // Optional: Clear the potentially invalid token if unauthorized
        if (err.message?.includes('401')) {
           sessionStorage.removeItem('spotify_access_token');
           setAccessToken(null); // Clear token state
           setError("Your Spotify session expired. Please log in again.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchTopTracks();

  }, [accessToken]); // Re-run this effect if the accessToken changes

  // --- Rendering Logic ---

  if (!accessToken && !loading && !error) {
    // Optionally render nothing or a prompt if the user isn't logged in via Spotify
    // return <Typography>Log in with Spotify to view your top tracks.</Typography>;
    return null; // Render nothing if no token and no loading/error state
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

  if (topTracks.length === 0) {
    // Handle case where user might have no top tracks or data isn't loaded yet
    return <Typography sx={{ my: 2, textAlign: 'center' }}>No top tracks found or data is still loading.</Typography>;
  }

  return (
    <Box sx={{ my: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Your Top Spotify Tracks
      </Typography>
      <List>
        {topTracks.map((track) => (
          <ListItem
            key={track.id}
            component="a" // Render as an anchor tag
            href={track.external_urls.spotify} // Link to the track on Spotify
            target="_blank" // Open in new tab
            rel="noopener noreferrer" // Security best practice
            sx={{ mb: 1, bgcolor: 'action.hover', borderRadius: 1 }} // Add some styling
          >
            <ListItemAvatar>
              {/* Use the smallest album art, usually the last in the array */}
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
