import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog, DialogTitle, DialogContent, IconButton, Box, Typography,
  List, ListItem, ListItemAvatar, Avatar, ListItemText, Button, Divider,
  TextField, CircularProgress, Alert, Chip, useTheme
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import StarIcon from '@mui/icons-material/Star';

import { SpotifyGridItem, GridItemType } from '@/types/spotify.types';
import { SelectionRole } from '@/types/museick.types';
import { searchSpotify, SpotifyAuthError } from '@/features/spotify/spotifyApi';
import { addSelectionCandidate, updateSelection } from '@/services/selectionApi';

const DEBOUNCE_DELAY = 500;
const MIN_SEARCH_LENGTH = 3;

type DisplayListItem = SpotifyGridItem & {
    type: GridItemType;
    selectionId?: string;
    selectionRole?: SelectionRole;
};

interface SelectionReplaceModalProps {
  open: boolean;
  onClose: () => void;
  monthIndex: number | null;
  monthName: string;
  year: number;
  onSelectReplacement: (item: DisplayListItem | null, monthIndex: number | null) => void;
  mode: 'muse' | 'ick';
  itemType: GridItemType;
  currentItem: SpotifyGridItem | undefined;
}

const getImageUrl = (item: DisplayListItem | SpotifyGridItem): string => {
    if ('album' in item && item.album && item.album.images) {
      return item.album.images?.[item.album.images.length - 1]?.url ?? '';
    }
    if ('images' in item && item.images) {
      return item.images?.[item.images.length - 1]?.url ?? '';
    }
    return '';
};

const getItemTitle = (item: DisplayListItem | SpotifyGridItem): string => item.name ?? 'Unknown Title';

const getItemSubtitle = (item: DisplayListItem | SpotifyGridItem): string => {
    if ('artists' in item && item.artists && 'album' in item) {
      return item.artists.map(a => a.name).join(', ');
    }
    if ('artists' in item && item.artists && 'release_date' in item) {
        return item.artists.map(a => a.name).join(', ');
    }
    if ('genres' in item && item.genres) {
      return item.genres.join(', ') || 'Artist';
    }
    return '';
};

export const SelectionReplaceModal: React.FC<SelectionReplaceModalProps> = ({
  open, onClose, monthIndex, monthName, year, onSelectReplacement, mode, itemType, currentItem
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedItems, setDisplayedItems] = useState<DisplayListItem[]>([]);
  const [shortlistItems, setShortlistItems] = useState<DisplayListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const targetCandidateRole: SelectionRole = mode === 'muse' ? 'muse_candidate' : 'ick_candidate';
  const targetSelectedRole: SelectionRole = mode === 'muse' ? 'muse_selected' : 'ick_selected';
  // Format month_year as YYYY-MM
  const candidateMonthYear = `${year}-${(monthIndex! + 1).toString().padStart(2, '0')}`;

  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setShortlistItems(currentItem ? [currentItem as DisplayListItem] : []);
      setDisplayedItems([]);
      setError(null);
      setLoading(false);
      setActionLoading(null);
    }
  }, [open, year, mode, itemType, currentItem]);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim()) {
        handleSearch();
      } else {
        setDisplayedItems([]);
      }
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, itemType]);

  const handleSearch = useCallback(async () => {
    if (searchTerm.trim().length < MIN_SEARCH_LENGTH) return;
    
    setLoading(true);
    setError(null);
    try {
      // Map 'song' to 'track' for Spotify API
      const spotifyType = itemType === 'song' ? 'track' : itemType;
      const results = await searchSpotify(searchTerm, [spotifyType], 20);
      let spotifyResults: DisplayListItem[] = [];

      if (itemType === 'song' && results.tracks) {
        spotifyResults = results.tracks.map(track => ({ ...track, type: 'song' }));
      } else if (itemType === 'artist' && results.artists) {
        spotifyResults = results.artists.map(artist => ({ ...artist, type: 'artist' }));
      } else if (itemType === 'album' && results.albums) {
        spotifyResults = results.albums.map(album => ({ ...album, type: 'album' }));
      }

      setDisplayedItems(spotifyResults);

    } catch (err: any) {
      console.error("Error searching Spotify:", err);
      if (err instanceof SpotifyAuthError) {
        setError("Spotify connection issue. Please reconnect Spotify via the main page.");
      } else {
        setError(`Spotify search failed: ${err.message}`);
      }
      setDisplayedItems([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, itemType]);

  const handleAddCandidate = async (item: DisplayListItem) => {
    if (!item.id || !item.type) {
        console.error("Cannot add candidate: Missing Spotify ID or type", item);
        setError("Cannot add candidate: Missing Spotify ID or type.");
        return;
    }
    const loadingId = item.selectionId || item.id;
    setActionLoading(loadingId);
    setError(null);
    
    try {
      const addedSelection = await addSelectionCandidate(item.id, item.type, candidateMonthYear, targetCandidateRole);
      const newItem: DisplayListItem = {
        ...item,
        selectionId: addedSelection.id,
        selectionRole: addedSelection.selection_role,
      };

      setShortlistItems(prev => [...prev, newItem]);
      
    } catch (err: any) {
      console.error("Error adding candidate:", err);
      if (err instanceof SpotifyAuthError) {
        setError("Please reconnect your Spotify account on the main page");
      } else {
        setError(`Failed to add candidate: ${err.message}`);
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSelectMain = async (item: DisplayListItem) => {
    if (monthIndex === null) {
        console.error("Cannot select for month: monthIndex is null.");
        setError("Cannot select for month: monthIndex is null.");
        return;
    }
    const loadingId = item.selectionId || item.id;
    setActionLoading(loadingId);
    setError(null);

    try {
        let finalItem = item;
        if (!item.selectionId) {
            if (!item.id || !item.type) {
                throw new Error("Missing Spotify ID or type for selection.");
            }
            const addedSelection = await addSelectionCandidate(item.id, item.type, candidateMonthYear, targetCandidateRole);
            finalItem = { ...item, selectionId: addedSelection.id, selectionRole: addedSelection.selection_role };
            setShortlistItems(prev => [...prev, finalItem]);
        }

        const updatedSelection = await updateSelection(finalItem.selectionId!, {
            selection_role: targetSelectedRole,
        });

        const selectedItem: DisplayListItem = {
            ...finalItem,
            selectionId: updatedSelection.id,
            selectionRole: updatedSelection.selection_role,
            id: updatedSelection.spotify_id || finalItem.id,
        };

        onSelectReplacement(selectedItem, monthIndex);
        onClose();

    } catch (err: any) {
        console.error("Error selecting item:", err);
        if (err instanceof SpotifyAuthError) {
          setError("Please reconnect your Spotify account on the main page");
        } else {
          setError(`Failed to select item: ${err.message}`);
        }
        setActionLoading(null);
    }
  };

  const isShortlisted = (itemId: string) => shortlistItems.some(item => item.id === itemId);
  const isCurrentSelection = (itemId: string) => currentItem?.id === itemId;
  const modalTitle = `Replace ${itemType} for ${monthName} ${year} (${mode === 'muse' ? 'Muse' : 'Ick'})`;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth scroll="paper">
      <DialogTitle sx={{ m: 0, p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {modalTitle}
        <IconButton aria-label="close" onClick={onClose} sx={{ color: (theme) => theme.palette.grey[500] }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
        {/* Shortlist Panel */}
        <Box sx={{ width: { xs: '100%', md: '40%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Shortlist for {monthName}</Typography>
          {actionLoading && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {!actionLoading && shortlistItems.length === 0 && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No {itemType}s shortlisted yet for {monthName}.
            </Typography>
          )}
          {!actionLoading && shortlistItems.length > 0 && (
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
              {shortlistItems.map((item) => (
                <ListItem key={item.id}
                  secondaryAction={
                    isCurrentSelection(item.id)
                      ? ( <Chip icon={<StarIcon />} label="Current" size="small" color="secondary" variant="outlined" /> )
                      : ( <Button size="small" variant="outlined" onClick={() => handleSelectMain(item)} disabled={!!actionLoading}
                          startIcon={<CheckCircleIcon />}> Select </Button> )
                  }
                  sx={{ bgcolor: isCurrentSelection(item.id) ? theme.palette.action.selected : 'inherit', 
                       borderRadius: 1, mb: 0.5 }}
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(item)} alt={item.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={getItemTitle(item)}
                    secondary={getItemSubtitle(item)}
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

        {/* Search Panel */}
        <Box sx={{ width: { xs: '100%', md: '60%' }, display: 'flex', flexDirection: 'column' }}>
          <Typography variant="h6" gutterBottom>Search Spotify</Typography>
          <TextField
            fullWidth
            label={`Search for a ${itemType}`}
            variant="outlined"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            size="small"
            sx={{ mb: 2 }}
          />
          {loading && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {!loading && displayedItems.length === 0 && searchTerm && searchTerm.length >= MIN_SEARCH_LENGTH && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No {itemType}s found.
            </Typography>
          )}
          {!loading && displayedItems.length > 0 && (
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1 }}>
              {displayedItems.map((item) => (
                <ListItem key={item.id}
                  secondaryAction={
                    isShortlisted(item.id)
                      ? ( <Chip label="Added" size="small" variant="outlined" /> )
                      : ( <IconButton edge="end" aria-label="add to shortlist" 
                          onClick={() => handleAddCandidate(item)} 
                          disabled={!!actionLoading}
                          color="primary">
                          <AddCircleOutlineIcon />
                        </IconButton> )
                  }
                >
                  <ListItemAvatar>
                    <Avatar variant="square" src={getImageUrl(item)} alt={item.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={getItemTitle(item)}
                    secondary={getItemSubtitle(item)}
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
