import React, { useState } from 'react';
import { LoadingButton } from '@mui/lab';
import { Tooltip } from '@mui/material';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import { createYearlyPlaylist } from '@/services/playlistApi';

interface CreatePlaylistButtonProps {
  year: number;
  mode: 'muse' | 'ick';
}

const CreatePlaylistButton: React.FC<CreatePlaylistButtonProps> = ({ year, mode }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatePlaylist = async () => {
    setLoading(true);
    setError(null);
    try {
      await createYearlyPlaylist(year, mode, false);
    } catch (err) {
      setError('Failed to create playlist');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Tooltip title={error || `Create ${year} ${mode} playlist`}>
      <LoadingButton
        onClick={handleCreatePlaylist}
        loading={loading}
        startIcon={<PlaylistAddIcon />}
        variant="contained"
        color={error ? 'error' : 'primary'}
        sx={{ ml: 2 }}
      >
        Create Playlist
      </LoadingButton>
    </Tooltip>
  );
};

export default CreatePlaylistButton;
