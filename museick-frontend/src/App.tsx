// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Container } from '@mui/material';

import theme from '@/theme/theme';
import Navbar from '@/components/layout/Navbar';
import Callback from '@/pages/Callback';
import HomePage from '@/pages/Home';
import Playground from '@/pages/Playground';
import NavigationSpeedDial from '@/components/layout/NavigationSpeedDial'; // <-- Import Speed Dial

const App: React.FC = () => (
  <ThemeProvider theme={theme}>
    <CssBaseline />
    <Router>
      <Navbar />
      {/* Page content container */}
      <Container maxWidth="lg" sx={{ py: 4, mb: 10 /* Add margin-bottom to prevent overlap with dial */ }}>
        <Routes>
          {/* Route for the Home page */}
          <Route path="/" element={<HomePage />} />
          {/* Route for the Spotify callback */}
          <Route path="/callback" element={<Callback />} />
          {/* Route for the Component Playground */}
          <Route path="/playground" element={<Playground />} />
          {/* Add other routes here if needed */}
        </Routes>
      </Container>

      {/* Navigation Speed Dial - Placed outside the main content Container */}
      <NavigationSpeedDial /> {/* <-- Add Speed Dial Component */}
    </Router>
  </ThemeProvider>
);

export default App;
