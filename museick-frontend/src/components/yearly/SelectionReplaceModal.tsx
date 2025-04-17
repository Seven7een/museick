import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  List, ListItem, ListItemAvatar, Avatar, ListItemText, Button, Divider,
  TextField, CircularProgress, Alert, Chip, useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';
import { MusicNote as MusicNoteIcon, Person as PersonIcon, Album as AlbumIcon } from '@mui/icons-material';

import { SpotifyGridItem, GridMode, GridItemType } from '@/types/spotify.types';
import { searchSpotify } from '@/features/spotify/spotifyApi';

interface SelectionReplaceModalProps {
  open: boolean;
  onClose: () => void;
  monthIndex: number | null;
  monthName: string;
  year: number;
  currentItem: SpotifyGridItem | undefined;
  onSelectReplacement: (monthIndex: number, newItem: SpotifyGridItem) => void;
  mode: GridMode;
  itemType: GridItemType;
}

const useMockShortlist = (
    currentItem: SpotifyGridItem | undefined,
    mode: GridMode,
    itemType: GridItemType,
    monthName: string,
    year: number
) => {
  const [shortlist, setShortlist] = useState<SpotifyGridItem[]>(() =>
    currentItem ? [currentItem] : []
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addToShortlist = async (item: SpotifyGridItem) => {
    setLoading(true); setError(null);
    console.log(`MOCK: Adding ${item.name} (${itemType}) to ${monthName} ${year} ${mode} shortlist (Backend Call)...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    setShortlist(prev => { if (prev.some(i => i.id === item.id)) return prev; return [...prev, item]; });
    setLoading(false);
  };

  const selectItem = async (monthIndex: number, item: SpotifyGridItem) => {
    setLoading(true); setError(null);
    console.log(`MOCK: Selecting ${item.name} (${itemType}) for ${monthName} ${year} ${mode} slot (Backend Call)...`);
    await new Promise(resolve => setTimeout(resolve, 300));
    setLoading(false);
    return item;
  };

  useEffect(() => {
    console.log("Current item changed, resetting shortlist state.");
    setShortlist(currentItem ? [currentItem] : []);
  }, [currentItem]);

  return { shortlist, addToShortlist, selectItem, loadingShortlist: loading, errorShortlist: error };
};

const DEBOUNCE_DELAY = 500;
const MIN_SEARCH_LENGTH = 3;

const SelectionReplaceModal: React.FC<SelectionReplaceModalProps> = ({
  open, onClose, monthIndex, monthName, year, currentItem, onSelectReplacement, mode, itemType
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SpotifyGridItem[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [errorSearch, setErrorSearch] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { shortlist, addToShortlist, selectItem, loadingShortlist, errorShortlist } = useMockShortlist(
      currentItem,
      mode,
      itemType,
      monthName,
      year
  );

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setSearchResults([]);
      setLoadingSearch(false);
      setErrorSearch('');
      setHasSearched(false);
    }
  }, [open, monthIndex]);

  const triggerApiSearch = useCallback(async (query: string) => {
     if (!query || query.length < MIN_SEARCH_LENGTH) {
       setSearchResults([]);
       setHasSearched(query.length > 0);
       setErrorSearch('');
       setLoadingSearch(false);
       return;
     }
     setLoadingSearch(true);
     setErrorSearch('');
     setHasSearched(true);
     try {
       const searchData = await searchSpotify(query);
       let relevantResults: SpotifyGridItem[] = [];
       switch (itemType) {
           case 'track': relevantResults = searchData.tracks; break;
           case 'artist': relevantResults = searchData.artists; break;
           case 'album': relevantResults = searchData.albums; break;
           default: relevantResults = [];
       }
       setSearchResults(relevantResults);
     } catch (err: any) {
       console.error("Modal Search Error:", err);
       setErrorSearch(err.message || `Error searching Spotify for ${itemType}s`);
       setSearchResults([]);
     } finally {
       setLoadingSearch(false);
     }
  }, [itemType]);

  useEffect(() => {
     if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
     const trimmedSearchTerm = searchTerm.trim();
     if (trimmedSearchTerm.length < MIN_SEARCH_LENGTH) {
       setSearchResults([]);
       setHasSearched(trimmedSearchTerm.length > 0);
       setErrorSearch('');
       setLoadingSearch(false);
       return;
     }
     setLoadingSearch(true);
     setErrorSearch('');
     setHasSearched(true);
     debounceTimeoutRef.current = setTimeout(() => {
       triggerApiSearch(trimmedSearchTerm);
     }, DEBOUNCE_DELAY);
     return () => {
       if (debounceTimeoutRef.current) clearTimeout(debounceTimeoutRef.current);
     };
  }, [searchTerm, triggerApiSearch]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleAddClick = async (item: SpotifyGridItem) => {
    await addToShortlist(item);
  };

  const handleSelectClick = async (item: SpotifyGridItem) => {
    if (monthIndex === null) return;
    const selected = await selectItem(monthIndex, item);
    if (selected) {
      onSelectReplacement(monthIndex, selected);
      onClose();
    }
  };

  const getImageUrl = (item?: SpotifyGridItem): string | undefined => {
      if (!item) return undefined;
      if ('album' in item && item.album?.images) {
        return item.album.images[item.album.images.length - 1]?.url ?? item.album.images[0]?.url;
      }
      if ('images' in item && item.images) {
        return item.images[item.images.length - 1]?.url ?? item.images[0]?.url;
      }
      return undefined;
  };

  const getSecondaryText = (item: SpotifyGridItem): string => {
      if ('artists' in item && item.artists) {
        return item.artists.map(a => a.name).join(', ');
      }
      if ('genres' in item && item.genres && item.genres.length > 0) {
        return item.genres.slice(0, 2).join(', ');
      }
      return '';
  };

  const isShortlisted = (itemId: string) => shortlist.some(item => item.id === itemId);
  const isCurrentSelection = (itemId: string) => currentItem?.id === itemId;
  const searchLabel = `Search for a ${itemType}`;
  const noResultsText = `No ${itemType}s found.`;
  const modalTitle = `Replace ${itemType} for ${monthName} ${year} (${mode === 'favorite' ? 'Muse' : 'Ick'})`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {modalTitle}
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        <Box sx={{ width: { xs: '100%', md: '40%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Shortlist for {monthName}</Typography>
          {loadingShortlist && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {errorShortlist && <Alert severity="error" sx={{ mb: 1 }}>{errorShortlist}</Alert>}
          {!loadingShortlist && shortlist.length === 0 && <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>No {itemType}s shortlisted yet for {monthName}.</Typography>}
          {!loadingShortlist && shortlist.length > 0 && (
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
              {shortlist.map((item) => (
                <ListItem key={item.id}
                  secondaryAction={
                    isCurrentSelection(item.id)
                      ? ( <Chip icon={<StarIcon />} label="Current" size="small" color="secondary" variant="outlined" /> )
                      : ( <Button size="small" variant="outlined" onClick={() => handleSelectClick(item)} disabled={loadingShortlist} startIcon={<CheckCircleIcon />}> Select </Button> )
                  }
                  sx={{ bgcolor: isCurrentSelection(item.id) ? theme.palette.action.selected : 'inherit', borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(item)} alt={item.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={getSecondaryText(item)}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>

        <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', md: 'block' } }} />
        <Divider sx={{ display: { xs: 'block', md: 'none' }, my: 2 }} />

        <Box sx={{ width: { xs: '100%', md: '60%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Search Spotify</Typography>
          <TextField
            fullWidth
            label={searchLabel}
            variant="outlined"
            value={searchTerm}
            onChange={handleInputChange}
            size="small"
            sx={{ mb: 2 }}
          />
          {loadingSearch && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {errorSearch && !loadingSearch && <Alert severity="error" sx={{ mb: 1 }}>{errorSearch}</Alert>}
          {!loadingSearch && hasSearched && searchResults.length === 0 && <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>{noResultsText}</Typography>}
          {!loadingSearch && searchResults.length > 0 && (
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
              {searchResults.map((item) => (
                <ListItem key={item.id}
                  secondaryAction={
                    isShortlisted(item.id)
                      ? ( <Chip label="Added" size="small" variant="outlined" /> )
                      : ( <IconButton edge="end" aria-label="add to shortlist" onClick={() => handleAddClick(item)} disabled={loadingShortlist} color="primary"> <AddCircleIcon /> </IconButton> )
                  }
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(item)} alt={item.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={item.name}
                    secondary={getSecondaryText(item)}
                    primaryTypographyProps={{ noWrap: true }}
                    secondaryTypographyProps={{ noWrap: true }}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default SelectionReplaceModal;
