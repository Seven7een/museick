import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Box,
  CircularProgress,
  Alert,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Stack,
  Skeleton,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import AlbumIcon from '@mui/icons-material/Album';
import { createYearlyPlaylist } from '@/services/playlistApi';
import { getPlaylistImages } from '@/features/spotify/spotifyApi';
import type { SpotifyImage } from '@/types/spotify.types';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  mode: 'muse' | 'ick';
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  open, onClose, year, mode
}) => {
  const [includeCandidates, setIncludeCandidates] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlistUrl, setPlaylistUrl] = useState<string | null>(null);
  const [playlistImage, setPlaylistImage] = useState<SpotifyImage | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [loadingText, setLoadingText] = useState<string>('');
  const playlistName = `Museick.app - ${year} ${mode}s`;

  // Extract playlist ID from URL and fetch image when playlist is created
  useEffect(() => {
    const fetchPlaylistImage = async (url: string) => {
      try {
        setImageLoading(true);
        setLoadingText('Getting playlist image');
        const playlistId = url.split('/playlist/')[1];
        if (!playlistId) return;

        // Add retry logic with exponential backoff
        const maxRetries = 3;
        const baseDelay = 1000; // Start with 1 second delay

        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            const images = await getPlaylistImages(playlistId);
            if (images && images.length > 0) {
              setPlaylistImage(images[0] || images[images.length - 1]);
              setLoadingText('');
              return;
            }
          } catch (error) {
            // Silent catch, keep trying
          }

          // Wait before next retry with exponential backoff
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt)));
          }
        }
        
        // If we get here, all retries failed
        setLoadingText('Failed to load image');
        setPlaylistImage(null);
      } catch (err) {
        setLoadingText('Failed to load image');
        setPlaylistImage(null);
      } finally {
        setImageLoading(false);
      }
    };

    if (playlistUrl) {
      fetchPlaylistImage(playlistUrl);
    }
  }, [playlistUrl]);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    setPlaylistUrl(null);
    setPlaylistImage(null);
    
    try {
      const spotifyToken = localStorage.getItem('spotify_access_token');
      if (!spotifyToken) {
        throw new Error('Spotify connection required. Please reconnect on the home page.');
      }
      
      const response = await createYearlyPlaylist(year, mode, includeCandidates);
      setPlaylistUrl(response.url);
    } catch (err) {
      console.error('Error creating playlist:', err);
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setError(null);
    setPlaylistUrl(null);
    setPlaylistImage(null);
    onClose();
  };

  return (
    <Dialog 
      open={open} 
      onClose={handleClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      {!playlistUrl ? (
        <>
          <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
            <Typography variant="h4" component="div" sx={{ mb: 1 }}>
              Create Playlist
            </Typography>
            <Typography 
              variant="subtitle1" 
              color="text.secondary" 
              gutterBottom 
              component="div"
            >
              Turn your {year} {mode}s into a Spotify playlist
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              py: 4
            }}>
              <FormControl>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={includeCandidates}
                      onChange={(e) => setIncludeCandidates(e.target.checked)}
                      disabled={isCreating}
                      sx={{ transform: 'scale(1.2)' }}
                    />
                  }
                  label={
                    <Typography variant="body1">
                      Include {mode === 'muse' ? 'muses shortlist' : 'icks shortlist'}
                    </Typography>
                  }
                />
              </FormControl>
              
              {error && (
                <Alert severity="error" sx={{ mt: 3, width: '100%' }}>
                  {error}
                </Alert>
              )}
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, justifyContent: 'center' }}>
            <Button 
              onClick={handleClose} 
              variant="outlined" 
              size="large"
              sx={{ minWidth: 120 }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreate}
              variant="contained"
              size="large"
              disabled={isCreating}
              sx={{ minWidth: 120 }}
            >
              {isCreating ? <CircularProgress size={24} /> : 'Create'}
            </Button>
          </DialogActions>
        </>
      ) : (
        <Box sx={{ p: 0 }}>
          <Card elevation={0}>
            {imageLoading ? (
              <Skeleton 
                variant="rectangular" 
                width="100%" 
                sx={{ 
                  aspectRatio: '1/1'
                }} 
              />
            ) : (
              <Box sx={{ 
                position: 'relative',
                width: '100%',
                aspectRatio: '1/1',
                bgcolor: 'grey.100'
              }}>
                {playlistImage?.url ? (
                  <CardMedia
                    component="img"
                    image={playlistImage.url}
                    alt="Playlist Cover"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                    onError={() => setPlaylistImage(null)}
                  />
                ) : (
                  <Box sx={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    bgcolor: 'grey.100'
                  }}>
                    <AlbumIcon sx={{ fontSize: 80, color: 'grey.400' }} />
                    {loadingText && (
                      <Stack direction="row" spacing={1} alignItems="center">
                        {!loadingText.includes('Failed') && (
                          <CircularProgress size={16} />
                        )}
                        <Typography 
                          variant="body2" 
                          color={loadingText.includes('Failed') ? 'error' : 'text.secondary'}
                        >
                          {loadingText}
                        </Typography>
                      </Stack>
                    )}
                  </Box>
                )}
              </Box>
            )}
            <CardContent sx={{ textAlign: 'center', pt: 3 }}>
              <Typography variant="h5" gutterBottom>
                {playlistName}
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                Your playlist has been created successfully!
              </Typography>
              <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 3 }}>
                <Button
                  variant="outlined"
                  onClick={handleClose}
                >
                  Close
                </Button>
                <Button
                  variant="contained"
                  href={playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<PlayArrowIcon />}
                >
                  Open in Spotify
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      )}
    </Dialog>
  );
};

export default CreatePlaylistModal;
