// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
import SpotifySearch from '@/features/spotify/SpotifySearch';
import Callback from '@/pages/Callback';

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Routes>
          <Route path="/" element={<SpotifySearch />} />
          <Route path="/callback" element={<Callback />} />
        </Routes>
      </Container>
    </Router>
  </ThemeProvider>
);

export default App;
