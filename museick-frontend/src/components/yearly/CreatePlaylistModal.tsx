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
  Avatar
} from '@mui/material';
import LaunchIcon from '@mui/icons-material/Launch';
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

  // Extract playlist ID from URL and fetch image when playlist is created
  useEffect(() => {
    const fetchPlaylistImage = async (url: string) => {
      try {
        // Extract playlist ID from Spotify URL
        const playlistId = url.split('/playlist/')[1];
        if (!playlistId) return;

        const images = await getPlaylistImages(playlistId);
        // Use the smallest image if available
        setPlaylistImage(images[images.length - 1] || images[0]);
      } catch (err) {
        console.error('Failed to fetch playlist image:', err);
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
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Create {year} {mode === 'muse' ? 'Muses' : 'Icks'} Playlist
      </DialogTitle>
      <DialogContent>
        {!playlistUrl && (
          <Box sx={{ mb: 2 }}>
            <FormControl component="fieldset">
              <FormControlLabel
                control={
                  <Checkbox
                    checked={includeCandidates}
                    onChange={(e) => setIncludeCandidates(e.target.checked)}
                    disabled={isCreating}
                  />
                }
                label={`Include ${mode === 'muse' ? 'potential muses' : 'potential icks'}`}
              />
            </FormControl>
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        
        {playlistUrl && (
          <Alert 
            severity="success" 
            sx={{ mt: 1 }}
            icon={playlistImage ? 
              <Avatar
                src={playlistImage.url}
                alt="Playlist cover"
                variant="square"
                sx={{ width: 40, height: 40 }}
              /> : undefined
            }
            action={
              <Button
                color="inherit"
                size="small"
                endIcon={<LaunchIcon />}
                href={playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
              >
                Open
              </Button>
            }
          >
            Playlist created successfully! 
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {playlistUrl ? 'Close' : 'Cancel'}
        </Button>
        {!playlistUrl && (
          <Button
            onClick={handleCreate}
            variant="contained"
            disabled={isCreating}
            startIcon={isCreating ? <CircularProgress size={20} /> : null}
          >
            Create Playlist
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
};

export default CreatePlaylistModal;
