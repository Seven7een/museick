// src/features/spotify/SpotifySearch.tsx
import React, { useState, SyntheticEvent, useEffect, useRef, useCallback } from 'react'; // Added useCallback
import {
  Box,
  TextField,
  Button, // Keep the button
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
  FormControlLabel, // Import FormControlLabel
  Checkbox,         // Import Checkbox
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
  const [searchAsYouTypeEnabled, setSearchAsYouTypeEnabled] = useState(true); // <-- State for the toggle
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // --- Core API Search Logic ---
  // Use useCallback to memoize this function
  const triggerApiSearch = useCallback(async (query: string) => {
    if (!query || query.length < MIN_SEARCH_LENGTH) {
      setResults(initialResultsState);
      setHasSearched(query.length > 0);
      setError('');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setHasSearched(true);
    // Don't clear results immediately here for better UX on explicit search
    // setResults(initialResultsState);

    try {
      const searchData = await searchSpotify(query);
      setResults(searchData);
      // Auto-select first tab with results
      if (searchData.tracks.length > 0) setSelectedTab(0);
      else if (searchData.artists.length > 0) setSelectedTab(1);
      else if (searchData.albums.length > 0) setSelectedTab(2);
      else setSelectedTab(0);

    } catch (err: any) {
      console.error("Search Error:", err);
      setError(err.message || 'Error searching Spotify');
      setResults(initialResultsState); // Clear results on error
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array for useCallback

  // --- Debounced Search Effect (Only runs if enabled) ---
  useEffect(() => {
    // --- Exit early if search-as-you-type is disabled ---
    if (!searchAsYouTypeEnabled) {
      // Clear any lingering timeout if the feature is disabled
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      // Optionally clear loading state if it was set before disabling
      // setLoading(false);
      return;
    }
    // --- End feature check ---

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
      triggerApiSearch(trimmedSearchTerm); // Call the extracted search logic
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
      handleExplicitSearch(); // Use the explicit search handler
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
    return images[images.length - 1].url;
  };

  // Helper to render a list of items for a specific tab
  const renderItemList = (items: any[], renderItem: (item: any) => React.ReactNode) => {
    // Don't show "no results" while loading new data, unless it's an explicit search
    // This needs careful handling if loading state is shared between debounce/explicit
    // if (loading) return null;

    if (!items || items.length === 0) {
      return (
        <Typography sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>
          No results found in this category.
        </Typography>
      );
    }
    return (
      <List dense sx={{ width: '100%', bgcolor: 'background.paper', p: 0 }}>
        {items.map((item, index) => (
          <React.Fragment key={(item as any).id || index}>
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
      <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} alignItems="stretch" sx={{ mb: 1 }}> {/* Reduced bottom margin */}
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
          onClick={handleExplicitSearch} // Use explicit search handler
          disabled={!searchTerm.trim() || loading}
          sx={{ flexShrink: 0, px: 3 }}
        >
          {/* Show loading only if triggered explicitly? Or always? Let's show always for now */}
          {loading ? <CircularProgress size={24} color="inherit" /> : 'Search'}
        </Button>
      </Stack>
      {/* Checkbox Row */}
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


      {/* Loading Indicator */}
      {loading && (
        <Box mt={4} display="flex" justifyContent="center">
          <CircularProgress />
        </Box>
      )}

      {/* Error Display */}
      {error && !loading && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}

      {/* Results Area with Tabs */}
      {/* Show results if a search has been attempted AND not currently loading */}
      {hasSearched && !loading && !error && (
         <Paper elevation={2} sx={{ mt: 3, overflow: 'hidden' }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs
              value={selectedTab}
              onChange={handleTabChange}
              aria-label="Search results tabs"
              variant="fullWidth"
              indicatorColor="primary"
              textColor="primary"
            >
              <Tab icon={<MusicNoteIcon />} iconPosition="start" label={`Tracks (${results.tracks.length})`} {...a11yProps(0)} />
              <Tab icon={<PersonIcon />} iconPosition="start" label={`Artists (${results.artists.length})`} {...a11yProps(1)} />
              <Tab icon={<AlbumIcon />} iconPosition="start" label={`Albums (${results.albums.length})`} {...a11yProps(2)} />
            </Tabs>
          </Box>

          {/* Tab Content */}
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
                    <Avatar src={getImageUrl(artist.images)} alt={artist.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={artist.name}
                    secondary={artist.genres?.slice(0, 3).join(', ')}
                  />
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
                    secondary={`${album.artists.map((artist) => artist.name).join(', ')} (${album.release_date?.substring(0, 4)})`}
                  />
                </ListItem>
              ))}
            </Box>
          )}
        </Paper>
      )}

       {/* Message when search term is too short */}
       {searchTerm.trim().length > 0 && searchTerm.trim().length < MIN_SEARCH_LENGTH && !loading && (
         <Typography sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
           Keep typing to search... (min {MIN_SEARCH_LENGTH} characters)
         </Typography>
       )}

    </Box>
  );
};

export default SpotifySearch;
