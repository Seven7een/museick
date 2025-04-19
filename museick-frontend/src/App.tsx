import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { CssBaseline, Container, Box } from '@mui/material';

import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial';
import TracksPage from '@/pages/TracksPage';
import ArtistsPage from '@/pages/ArtistsPage';
import AlbumsPage from '@/pages/AlbumsPage';

import { ThemeProvider, useThemeContext } from './context/ThemeContext';

// Main App Content Component (to allow hooks within Router context)
const AppContent: React.FC = () => {
  const { mode } = useThemeContext();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: mode === 'muse'
          ? 'linear-gradient(135deg, #FAFAFA 0%, #FFF1F5 100%)'
          : 'linear-gradient(135deg, #FAFAFA 0%, #F0F7F6 100%)',
        transition: 'background 0.5s ease',
      }}
    >
      <Navbar />
      <Container 
        maxWidth="lg" 
        sx={{ 
          py: 4, 
          mb: 10,
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: mode === 'muse'
              ? 'radial-gradient(circle at 0% 0%, rgba(255, 51, 102, 0.05) 0%, transparent 50%)'
              : 'radial-gradient(circle at 100% 0%, rgba(42, 157, 143, 0.05) 0%, transparent 50%)',
            transition: 'background 0.5s ease',
            pointerEvents: 'none',
          }
        }}
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/playground" element={<Playground />} />
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />
        </Routes>
      </Container>
      <NavigationSpeedDial />
    </Box>
  );
};

// Main App Wrapper
const App: React.FC = () => (
  <ThemeProvider>
    <Router>
      <AppContent />
    </Router>
  </ThemeProvider>
);

export default App;
