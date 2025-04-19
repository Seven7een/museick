import { createTheme, ThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    muse: Palette['primary'];
    ick: Palette['primary'];
  }
  interface PaletteOptions {
    muse?: PaletteOptions['primary'];
    ick?: PaletteOptions['primary'];
  }
}

const baseTheme: ThemeOptions = {
  typography: {
    fontFamily: "'Poppins', 'Roboto', sans-serif",
  },
};

export const museTheme = createTheme({
  ...baseTheme,
  palette: {
    primary: {
      main: '#FF3366', // Deep rose pink
      light: '#FF6B8E',
      dark: '#CC1A4D',
    },
    secondary: {
      main: '#6B4CF6', // Rich purple
      light: '#8C75F7',
      dark: '#4933B3',
    },
    muse: {
      main: '#FF3366',
      light: '#FF6B8E',
      dark: '#CC1A4D',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
});

export const ickTheme = createTheme({
  ...baseTheme,
  palette: {
    primary: {
      main: '#2A9D8F', // Deep teal
      light: '#4DB5A9',
      dark: '#1E7268',
    },
    secondary: {
      main: '#264653', // Dark slate
      light: '#3A5A68',
      dark: '#1B323B',
    },
    ick: {
      main: '#2A9D8F',
      light: '#4DB5A9',
      dark: '#1E7268',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
  },
});
