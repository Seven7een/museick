import React from 'react';
import { Typography, Container, Divider } from '@mui/material';
import SpotifySearch from '@/features/spotify/SpotifySearch';

import YearlySelectionGrid from '@/components/yearly/YearlySelectionGrid';

const Playground: React.FC = () => {
  const currentYear = 2024; // Use year instead of month string

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Component Playground - {currentYear} Selections
      </Typography>

      <Typography variant="h4" component="h2" gutterBottom>Track Selection Grids</Typography>
      <YearlySelectionGrid mode="muse" itemType="track" year={currentYear} /> 
      <Divider sx={{ my: 5 }} />
      <YearlySelectionGrid mode="ick" itemType="track" year={currentYear} /> 
      <Divider sx={{ my: 5 }} />

      <Typography variant="h4" component="h2" gutterBottom>Artist Selection Grid</Typography>
      <YearlySelectionGrid mode="muse" itemType="artist" year={currentYear} />
      <Divider sx={{ my: 5 }} />

      <Typography variant="h4" component="h2" gutterBottom>Album Selection Grid</Typography>
      <YearlySelectionGrid mode="muse" itemType="album" year={currentYear} />
      <Divider sx={{ my: 5 }} />

      <Typography variant="h4" component="h2" gutterBottom>Spotify Search Component</Typography>
      <SpotifySearch />

    </Container>
  );
};

export default Playground;
