// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial';

// --- Import New Pages ---
import TracksPage from '@/pages/TracksPage';
import ArtistsPage from '@/pages/ArtistsPage';
import AlbumsPage from '@/pages/AlbumsPage';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <Navbar />
      {/* Page content container */}
      <Container maxWidth="lg" sx={{ py: 4, mb: 10 /* Margin for Speed Dial */ }}>
        <Routes>
          {/* Existing Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/callback" element={<Callback />} />
          <Route path="/playground" element={<Playground />} />

          {/* --- New Routes --- */}
          <Route path="/tracks" element={<TracksPage />} />
          <Route path="/artists" element={<ArtistsPage />} />
          <Route path="/albums" element={<AlbumsPage />} />

          {/* Add other routes here if needed */}
          {/* Example: Route for a specific year */}
          {/* <Route path="/tracks/:year" element={<TracksPage />} /> */}

        </Routes>
      </Container>

      {/* Navigation Speed Dial */}
      <NavigationSpeedDial />
    </Router>
  </ThemeProvider>
);

export default App;
