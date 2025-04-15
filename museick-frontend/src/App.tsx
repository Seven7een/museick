// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
// Remove direct import of SpotifySearch if it's only used in HomePage now
// import SpotifySearch from '@/features/spotify/SpotifySearch';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home'; // <-- Import the new HomePage component

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <Navbar />
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Routes>
          {/* Update the root path to render HomePage */}
          <Route path="/" element={<HomePage />} /> {/* <-- Use HomePage here */}
          {/* Keep the callback route */}
          <Route path="/callback" element={<Callback />} />
          {/* Add other routes here if needed */}
        </Routes>
      </Container>
    </Router>
  </ThemeProvider>
);

export default App;
