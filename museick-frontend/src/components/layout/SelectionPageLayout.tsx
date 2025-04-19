import React, { useState, useEffect } from 'react';
import { Box, Typography, Container, ToggleButtonGroup, ToggleButton, Fade, Paper, Button } from '@mui/material';
import FavoriteIcon from '@mui/icons-material/Favorite';
import HeartBrokenIcon from '@mui/icons-material/HeartBroken';
import { useAuth } from "@clerk/clerk-react";
import { SignInButton as ClerkSignInButton } from "@clerk/clerk-react";
import { useThemeContext } from '@/context/ThemeContext';
import { useNavigate, useParams } from 'react-router-dom';

import YearlySelectionGrid from '@/components/yearly/YearlySelectionGrid';
import YearSelect from '@/components/yearly/YearSelect';
import { GridItemType, GridMode } from '@/types/spotify.types';

interface SelectionPageLayoutProps {
  itemType: GridItemType;
  pageTitle: string;
}

const SelectionPageLayout: React.FC<SelectionPageLayoutProps> = ({ itemType, pageTitle }) => {
  const navigate = useNavigate();
  const { year: yearParam } = useParams();
  const year = parseInt(yearParam || new Date().getFullYear().toString(), 10);

  const { isSignedIn } = useAuth();
  const { mode, setMode } = useThemeContext();
  const [visibleMode, setVisibleMode] = useState<GridMode>(mode); // Initialize from theme

  // Sync local state with theme context
  useEffect(() => {
    setVisibleMode(mode);
  }, [mode]);

  const handleModeChange = (_: React.MouseEvent<HTMLElement>, newMode: GridMode | null) => {
    if (newMode !== null) {
      setVisibleMode(newMode);
      setMode(newMode);
    }
  };

  const handleYearChange = (newYear: number) => {
    navigate(`/${itemType}s/${newYear}`);
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
          <ClerkSignInButton mode="modal">
            <Button variant="contained">Sign In</Button>
          </ClerkSignInButton>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2 }}>
        <Typography variant="h4" component="h1">
          {pageTitle}
        </Typography>
        <YearSelect 
          currentYear={year} 
          onYearSelect={handleYearChange}
        />
      </Box>

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
