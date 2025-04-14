// src/features/spotify/SpotifySearch.tsx
import React, { useState } from 'react';
import { Box, TextField, Button, Typography, Stack, Card, CardContent, CardMedia, CircularProgress } from '@mui/material';
import { searchSpotify } from '@/features/spotify/spotifyApi';

const SpotifySearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async () => {
    setLoading(true);
    setError('');
    try {
      const tracks = await searchSpotify(searchTerm);
      setResults(tracks);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error searching Spotify');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Find Your Muse or Ick
      </Typography>
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="center">
        <TextField
          fullWidth
          label="Search for a song on Spotify"
          variant="outlined"
          value={searchTerm}
          onChange={handleInputChange}
          onKeyPress={handleKeyPress}
          sx={{ flexGrow: 1 }}
        />
        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={!searchTerm.trim()}
          sx={{ flexShrink: 0 }}
        >
          Search
        </Button>
      </Stack>

      {loading && (
        <Box mt={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Typography color="error" mt={4} align="center">
          {error}
        </Typography>
      )}

      <Box mt={4}>
        {results.map((track) => (
          <Card key={track.id} sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
            <CardMedia
              component="img"
              sx={{ width: 80, height: 80 }}
              image={track.album.images[0]?.url}
              alt={track.name}
            />
            <CardContent sx={{ flex: 1 }}>
              <Typography variant="subtitle1">{track.name}</Typography>
              <Typography variant="body2" color="text.secondary">
                {track.artists.map((artist: any) => artist.name).join(', ')}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
};

export default SpotifySearch;
