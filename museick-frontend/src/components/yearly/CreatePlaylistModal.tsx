import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControl,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  CircularProgress
} from '@mui/material';

interface CreatePlaylistModalProps {
  open: boolean;
  onClose: () => void;
  year: number;
  mode: 'muse' | 'ick';
  onCreatePlaylist: (includeCandidates: boolean, spotifyToken: string) => Promise<void>;
  error?: string | null;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  open, onClose, year, mode, onCreatePlaylist, error
}) => {
  const [includeCandidates, setIncludeCandidates] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [localError, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    setIsCreating(true);
    setError(null);
    try {
      const spotifyToken = localStorage.getItem('spotify_access_token');
      if (!spotifyToken) {
        throw new Error('Spotify connection required. Please reconnect on the home page.');
      }
      await onCreatePlaylist(includeCandidates, spotifyToken);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create playlist');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>
        Create {year} {mode === 'muse' ? 'Muses' : 'Icks'} Playlist
      </DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 2 }}>
          <FormControl component="fieldset">
            <FormControlLabel
              control={
                <Checkbox
                  checked={includeCandidates}
                  onChange={(e) => setIncludeCandidates(e.target.checked)}
                />
              }
              label={`Include ${mode === 'muse' ? 'potential muses' : 'potential icks'}`}
            />
          </FormControl>
        </Box>
        {(error || localError) && (
          <Typography color="error" sx={{ px: 3, pb: 2 }}>
            {error || localError}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isCreating}>
          Cancel
        </Button>
        <Button
          onClick={handleCreate}
          variant="contained"
          disabled={isCreating}
          startIcon={isCreating ? <CircularProgress size={20} /> : null}
        >
          Create Playlist
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CreatePlaylistModal;
