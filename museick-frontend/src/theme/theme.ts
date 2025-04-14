// src/theme/theme.ts
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    mode: 'light', // Or 'dark'
    primary: {
      main: '#6741d9', // Museick Purple
    },
    secondary: {
      main: '#ff4081', // Accent Pink
    },
    background: {
      default: '#f4f6f8',
      paper: '#ffffff',
    },
  },
  shape: {
    borderRadius: 12,
  },
});

export default theme;
