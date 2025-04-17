import React, { useState, SyntheticEvent, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Stack,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  ListItemText,
  Divider,
  Tabs,
  Tab,
  Autocomplete,
  Paper,
  FormControlLabel,
  Checkbox,
} from '@mui/material';
import {
  MusicNote as MusicNoteIcon,
  Person as PersonIcon,
  Album as AlbumIcon,
} from '@mui/icons-material';
import {
  searchSpotify,
  SpotifySearchResults,
  SpotifyTrackItem,
  SpotifyArtistItem,
  SpotifyAlbumItem,
} from '@/features/spotify/spotifyApi';

// Initial empty state for results
const initialResultsState: SpotifySearchResults = {
  tracks: [],
  artists: [],
  albums: [],
};

// Debounce delay in milliseconds
const DEBOUNCE_DELAY = 500;
const MIN_SEARCH_LENGTH = 3;

// Helper function for Tab Panel accessibility
function a11yProps(index: number) {
  return {
    id: `search-tab-${index}`,
    'aria-controls': `search-tabpanel-${index}`,
  };
}

const SpotifySearch: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<SpotifySearchResults>(initialResultsState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedTab, setSelectedTab] = useState(0);
  const [searchAsYouTypeEnabled, setSearchAsYouTypeEnabled] = useState(true);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use useCallback to memoize this function
  const triggerApiSearch = useCallback(async (query: string) => {
    if (query.length < MIN_SEARCH_LENGTH) {
      setResults(initialResultsState);
      setHasSearched(query.length > 0);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);

    try {
      const searchResults = await searchSpotify(query, ['track', 'artist', 'album'], 10);
      setResults(searchResults);
    } catch (err: any) {
      console.error("Error searching Spotify:", err);
      setError(err.message || 'Failed to search Spotify.');
      setResults(initialResultsState); // Clear results on error
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array for useCallback

  useEffect(() => {
    if (!searchAsYouTypeEnabled) {
      // Clear any lingering timeout if the feature is disabled
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Optionally clear loading state if it was set before disabling
      // setLoading(false);
      return;
    }

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    const trimmedSearchTerm = searchTerm.trim();

    if (trimmedSearchTerm.length < MIN_SEARCH_LENGTH) {
      setResults(initialResultsState);
      setHasSearched(trimmedSearchTerm.length > 0);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true); // Set loading for debounce period
    setError('');
    setHasSearched(true);

    debounceTimeoutRef.current = setTimeout(() => {
      triggerApiSearch(trimmedSearchTerm);
    }, DEBOUNCE_DELAY);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
    // Depend on searchTerm and the enable flag
  }, [searchTerm, searchAsYouTypeEnabled, triggerApiSearch]);

  // Update search term based on Autocomplete input
  const handleInputChange = (_: SyntheticEvent<Element, Event>, newInputValue: string) => {
    setSearchTerm(newInputValue);
  };

  // Handle explicit search triggers (Button click, Enter key)
  const handleExplicitSearch = () => {
    // Clear any pending debounced search
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    triggerApiSearch(searchTerm.trim()); // Trigger search immediately
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !loading) {
      event.preventDefault();
      handleExplicitSearch();
    }
  };

  // Handle tab changes
  const handleTabChange = (_: SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // Handle checkbox change
  const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchAsYouTypeEnabled(event.target.checked);
    // If disabling, clear any pending search and loading state
    if (!event.target.checked) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      setLoading(false); // Stop loading indicator if it was on due to debounce
    }
  };

  // Helper function to get the smallest image URL or a placeholder
  const getImageUrl = (images: { url: string }[] | undefined): string | undefined => {
    if (!images || images.length === 0) {
      return undefined;
    }
    // Assuming the last image is the smallest, adjust if needed
    return images[images.length - 1]?.url;
  };

  // Helper to render a list of items (Tracks, Artists, Albums)
  const renderItemList = (items: any[], renderItem: (item: any) => React.ReactNode) => {
    if (loading) return null; // Don't render list while loading new results

    if (!hasSearched) {
      return <Typography sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>Enter a search term above.</Typography>;
    }

    if (items.length === 0) {
      return <Typography sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>No results found.</Typography>;
    }

    return (
      <List dense component={Paper} elevation={1} sx={{ mt: 1 }}>
        {items.map((item, index) => (
          <React.Fragment key={item.id}>
            {renderItem(item)}
            {index < items.length - 1 && <Divider variant="inset" component="li" />}
          </React.Fragment>
        ))}
      </List>
    );
  };


  return (
    <Box sx={{ width: '100%', my: 2 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        Find Your Muse or Ick
      </Typography>
      {/* Input Row */}
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="stretch" sx={{ mb: 1 }}>
        <Autocomplete
          freeSolo
          fullWidth
          inputValue={searchTerm}
          onInputChange={handleInputChange}
          options={[]}
          sx={{ flexGrow: 1 }}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Search Spotify (Track, Artist, Album)"
              variant="outlined"
              onKeyPress={handleKeyPress} // Handle Enter key press for explicit search
            />
          )}
        />
        <Button
          variant="contained"
          onClick={handleExplicitSearch}
          disabled={!searchTerm.trim() || loading}
          sx={{ flexShrink: 0, px: 3 }}
        >
          {/* Show loading only if triggered explicitly? Or always? Let's show always for now */}
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
        </Button>
      </Stack>
      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 3 }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={searchAsYouTypeEnabled}
              onChange={handleCheckboxChange}
              name="searchAsYouType"
              color="primary"
            />
          }
          label="Search as you type"
        />
      </Box>


      {loading && (
        <Box mt={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Area */}
      {hasSearched && !loading && !error && (
        <Box sx={{ mt: 2 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={selectedTab} onChange={handleTabChange} aria-label="Search results tabs" variant="fullWidth">
              <Tab icon={<MusicNoteIcon />} iconPosition="start" label={`Tracks (${results.tracks.length})`} {...a11yProps(0)} />
              <Tab icon={<PersonIcon />} iconPosition="start" label={`Artists (${results.artists.length})`} {...a11yProps(1)} />
              <Tab icon={<AlbumIcon />} iconPosition="start" label={`Albums (${results.albums.length})`} {...a11yProps(2)} />
            </Tabs>
          </Box>

          {selectedTab === 0 && (
            <Box role="tabpanel" id="search-tabpanel-0" aria-labelledby="search-tab-0">
              {renderItemList(results.tracks, (track: SpotifyTrackItem) => (
                <ListItem
                  component="a"
                  href={track.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(track.album.images)} alt={track.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={track.name}
                    secondary={track.artists.map((artist) => artist.name).join(', ')}
                  />
                </ListItem>
              ))}
            </Box>
          )}

          {selectedTab === 1 && (
            <Box role="tabpanel" id="search-tabpanel-1" aria-labelledby="search-tab-1">
              {renderItemList(results.artists, (artist: SpotifyArtistItem) => (
                <ListItem
                  component="a"
                  href={artist.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ListItemAvatar>
                    <Avatar variant="circular" src={getImageUrl(artist.images)} alt={artist.name} />
                  </ListItemAvatar>
                  <ListItemText primary={artist.name} />
                </ListItem>
              ))}
            </Box>
          )}

          {selectedTab === 2 && (
            <Box role="tabpanel" id="search-tabpanel-2" aria-labelledby="search-tab-2">
              {renderItemList(results.albums, (album: SpotifyAlbumItem) => (
                <ListItem
                  component="a"
                  href={album.external_urls.spotify}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(album.images)} alt={album.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={album.name}
                    secondary={album.artists.map((artist) => artist.name).join(', ')}
                  />
                </ListItem>
              ))}
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default SpotifySearch;
