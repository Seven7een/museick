// src/components/layout/SelectionPageLayout.tsx
import React, { useState } from 'react';
import { Box, Typography, Container, ToggleButtonGroup, ToggleButton, Fade, Paper, Button } from '@mui/material'; // Added Paper, Button
import FavoriteIcon from '@mui/icons-material/Favorite';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import { useAuth, SignInButton } from "@clerk/clerk-react"; // Import useAuth, SignInButton

import YearlySelectionGrid from '@/components/yearly/YearlySelectionGrid';
import { GridItemType, GridMode } from '@/types/spotify.types';

interface SelectionPageLayoutProps {
  itemType: GridItemType;
  year: number;
}

const SelectionPageLayout: React.FC<SelectionPageLayoutProps> = ({ itemType, year }) => {
  const [visibleMode, setVisibleMode] = useState<GridMode>('favorite');
  const { isSignedIn } = useAuth(); // Get Clerk auth state

  const handleModeChange = (
    event: React.MouseEvent<HTMLElement>,
    newMode: GridMode | null,
  ) => {
    if (newMode !== null) {
      setVisibleMode(newMode);
    }
  };

  const pageTitle = itemType.charAt(0).toUpperCase() + itemType.slice(1) + 's';

  // --- Protection Guard ---
  if (!isSignedIn) {
    return (
      <Container maxWidth="sm" sx={{ py: 4, textAlign: 'center' }}> {/* Center content */}
        <Paper elevation={2} sx={{ p: 4, mt: 4 }}>
          <Typography variant="h5" gutterBottom>
            Access Denied
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Please sign in to manage your yearly {pageTitle.toLowerCase()}.
          </Typography>
          <SignInButton mode="modal">
             <Button variant="contained">Sign In</Button>
          </SignInButton>
        </Paper>
      </Container>
    );
  }

  // --- Render actual layout if signed in ---
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom align="center">
        {year} {pageTitle}
      </Typography>

      {/* Toggle Button Group */}
      <Box sx={{ display: 'flex', justifyContent: 'center', mb: 4 }}>
        <ToggleButtonGroup
          value={visibleMode}
          exclusive
          onChange={handleModeChange}
          aria-label="Select Mode (Muses or Icks)"
          color="primary"
        >
          <ToggleButton value="favorite" aria-label="Show Muses (Favorites)">
            <FavoriteIcon sx={{ mr: 1 }} />
            Muses
          </ToggleButton>
          <ToggleButton value="leastFavorite" aria-label="Show Icks (Least Favorites)">
            <HeartBrokenIcon sx={{ mr: 1 }} />
            Icks
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Container for Grids with Fade Transition */}
      <Box sx={{ position: 'relative' }}>
        {/* Favorite Grid */}
        <Fade in={visibleMode === 'favorite'} timeout={500} unmountOnExit>
          <Box>
            <YearlySelectionGrid mode="favorite" itemType={itemType} year={year} />
          </Box>
        </Fade>

        {/* Least Favorite Grid */}
        <Fade in={visibleMode === 'leastFavorite'} timeout={500} unmountOnExit>
           <Box>
            <YearlySelectionGrid mode="leastFavorite" itemType={itemType} year={year} />
          </Box>
        </Fade>
      </Box>
    </Container>
  );
};

export default SelectionPageLayout;
