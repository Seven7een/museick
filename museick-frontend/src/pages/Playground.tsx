// src/pages/Playground.tsx
import React from 'react';
import { Box, Typography, Container, Divider } from '@mui/material';
import SpotifySearch from '@/features/spotify/SpotifySearch';

// --- Corrected Import Name ---
import YearlySelectionGrid from '@/components/yearly/YearlySelectionGrid'; // Adjust path if needed

const Playground: React.FC = () => {
  const currentYear = 2024; // Use year instead of month string

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Component Playground - {currentYear} Selections
      </Typography>

      {/* --- Use Corrected Component Name and 'year' prop --- */}
      <YearlySelectionGrid mode="favorite" itemType="track" year={currentYear} />
      <Divider sx={{ my: 5 }} />

      <YearlySelectionGrid mode="leastFavorite" itemType="track" year={currentYear} />
      <Divider sx={{ my: 5 }} />

      <YearlySelectionGrid mode="favorite" itemType="artist" year={currentYear} />
      <Divider sx={{ my: 5 }} />

      <YearlySelectionGrid mode="favorite" itemType="album" year={currentYear} />

      <SpotifySearch />

    </Container>
  );
};

export default Playground;
