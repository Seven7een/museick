import React, { useState } from 'react';
import { Box, Typography, Container, ToggleButtonGroup, ToggleButton, Fade, Paper, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import { useAuth, SignInButton } from "@clerk/clerk-react";
import { useThemeContext } from '@/context/ThemeContext';

import YearlySelectionGrid from '@/components/yearly/YearlySelectionGrid';
import { GridItemType, GridMode } from '@/types/spotify.types';

interface SelectionPageLayoutProps {
  itemType: GridItemType;
  year: number;
  pageTitle: string;
}

const SelectionPageLayout: React.FC<SelectionPageLayoutProps> = ({ itemType, year, pageTitle }) => {
  const [visibleMode, setVisibleMode] = useState<GridMode>('muse');
  const { isSignedIn } = useAuth();
  const { setMode } = useThemeContext();

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: GridMode | null) => {
    if (newMode !== null) {
      console.log('Changing mode to:', newMode);
      setVisibleMode(newMode);
      setMode(newMode);
    }
  };

  if (!isSignedIn) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
        <Paper elevation={3} sx={{ p: 4 }}>
          <Typography variant="h5" gutterBottom>
            Please Sign In
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You need to be signed in to view and manage your {pageTitle.toLowerCase()} for {year}.
          </Typography>
          <SignInButton mode="modal">
            <Button variant="contained">Sign In</Button>
          </SignInButton>
        </Paper>
      </Container>
    );
  }

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
          <ToggleButton value="muse" aria-label="Show Muses (Favorites)">
            <FavoriteIcon sx={{ mr: 1 }} />
            Muses
          </ToggleButton>
          <ToggleButton value="ick" aria-label="Show Icks (Least Favorites)">
            <HeartBrokenIcon sx={{ mr: 1 }} />
            Icks
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Container for Grids with Fade Transition */}
      <Box sx={{ position: 'relative' }}>
        {/* Muse Grid */}
        <Fade in={visibleMode === 'muse'} timeout={500} unmountOnExit>
          <Box>
            <YearlySelectionGrid mode="muse" itemType={itemType} year={year} />
          </Box>
        </Fade>

        {/* Ick Grid */}
        <Fade in={visibleMode === 'ick'} timeout={500} unmountOnExit>
           <Box>
            <YearlySelectionGrid mode="ick" itemType={itemType} year={year} />
          </Box>
        </Fade>
      </Box>
    </Container>
  );
};

export default SelectionPageLayout;
