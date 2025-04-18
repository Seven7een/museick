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

import { SpotifyGridItem, GridItemType, SpotifySearchResults, SpotifyTrackItem, SpotifyAlbumItem, SpotifyArtistItem } from '@/types/spotify.types'; // Added missing imports
import { SelectionRole, UserSelection } from '@/types/museick.types'; // Added UserSelection import
import { searchSpotify, SpotifyAuthError, getSpotifyItemDetails } from '@/features/spotify/spotifyApi'; // Import getSpotifyItemDetails
import { addSelectionCandidate, updateSelection, listSelectionsForMonth } from '@/services/selectionApi'; // Import listSelectionsForMonth

const DEBOUNCE_DELAY = 500;
const MIN_SEARCH_LENGTH = 3;

// Define a more specific type for items displayed in the list, including selection info
type DisplayListItem = (SpotifyTrackItem | SpotifyAlbumItem | SpotifyArtistItem) & {
    type: GridItemType; // Ensure type is always present and correct ('track', 'album', 'artist')
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
  itemType: GridItemType; // Should be 'track', 'album', or 'artist'
  currentItem: SpotifyGridItem | undefined;
}

// Helper to get image URL, handling different item structures
const getImageUrl = (item: DisplayListItem | SpotifyGridItem): string => {
    // Check if it's a track item (has album property)
    if ('album' in item && item.album && item.album.images && item.album.images.length > 0) {
      // Prefer smaller image if available, otherwise fallback
      return item.album.images[item.album.images.length - 1]?.url ?? item.album.images[0]?.url ?? '';
    }
    // Check if it's an album or artist item (has images property)
    if ('images' in item && item.images && item.images.length > 0) {
      return item.images[item.images.length - 1]?.url ?? item.images[0]?.url ?? '';
    }
    return ''; // Fallback empty string
};

// Helper to get primary text (name)
const getItemTitle = (item: DisplayListItem | SpotifyGridItem): string => item.name ?? 'Unknown Title';

// Helper to get secondary text (artists, genres, etc.)
const getItemSubtitle = (item: DisplayListItem | SpotifyGridItem): string => {
    // For Tracks and Albums: show artists
    if ('artists' in item && item.artists && item.artists.length > 0) {
      return item.artists.map(a => a.name).join(', ');
    }
    // For Artists: show genres if available
    if ('genres' in item && item.genres && item.genres.length > 0) {
      return item.genres.join(', ');
    }
    // Fallback for artists without genres or other types - Check if 'type' exists
    if ('type' in item && item.type === 'artist') return 'Artist';
    return ''; // Default empty string
};


export const SelectionReplaceModal: React.FC<SelectionReplaceModalProps> = ({
  open, onClose, monthIndex, monthName, year, onSelectReplacement, mode, itemType, currentItem
}) => {
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [displayedItems, setDisplayedItems] = useState<DisplayListItem[]>([]);
  const [shortlistItems, setShortlistItems] = useState<DisplayListItem[]>([]); // Holds candidates + current item
  const [loadingSearch, setLoadingSearch] = useState(false); // Loading state for search results
  const [loadingShortlist, setLoadingShortlist] = useState(false); // Loading state for shortlist
  const [error, setError] = useState<string | null>(null); // General error state for modal
  const [actionLoading, setActionLoading] = useState<string | null>(null); // ID of item being actioned (added/selected)

  const targetCandidateRole: SelectionRole = mode === 'muse' ? 'muse_candidate' : 'ick_candidate';
  const targetSelectedRole: SelectionRole = mode === 'muse' ? 'muse_selected' : 'ick_selected';
  // Format month_year as YYYY-MM
  const candidateMonthYear = monthIndex !== null ? `${year}-${(monthIndex + 1).toString().padStart(2, '0')}` : '';

  // Fetch shortlist data when modal opens or relevant props change
  const fetchShortlist = useCallback(async () => {
    if (!open || monthIndex === null) return; // Don't fetch if not open or month invalid

    setLoadingShortlist(true);
      setError(null); // Clear previous errors
      setShortlistItems([]); // Clear previous shortlist

      try {
        const selections: UserSelection[] = await listSelectionsForMonth(candidateMonthYear); // Add type annotation

        // Filter for relevant roles and item type
        const relevantSelections = selections.filter((sel: UserSelection) => // Add type annotation
          sel.item_type === itemType &&
          (sel.selection_role === targetSelectedRole || sel.selection_role === targetCandidateRole)
        );

        // Fetch details for each relevant selection
        const detailedItemsPromises = relevantSelections.map(async (sel: UserSelection) => { // Add type annotation
          try {
            const details = await getSpotifyItemDetails(sel.spotify_item_id, itemType);
            // Combine Spotify details with our selection info
            return {
            ...details,
            type: itemType, // Ensure type is set correctly
            id: sel.spotify_item_id, // Use spotify ID as primary ID
            selectionId: sel.id,
            selectionRole: sel.selection_role,
          } as DisplayListItem;
        } catch (detailError: any) {
          console.error(`Failed to fetch details for ${itemType} ${sel.spotify_item_id}:`, detailError);
          // Return null or a placeholder if details fail? For now, filter out failed items.
          return null;
        }
      });

      const detailedItems = (await Promise.all(detailedItemsPromises)).filter(item => item !== null) as DisplayListItem[];
      setShortlistItems(detailedItems);

    } catch (err: any) {
      console.error("Error fetching shortlist selections:", err);
      setError(err.message || 'Failed to load shortlist.');
      setShortlistItems([]); // Clear on error
    } finally {
      setLoadingShortlist(false);
    }
  }, [open, monthIndex, candidateMonthYear, itemType, targetSelectedRole, targetCandidateRole]); // Dependencies for fetchShortlist


  // Reset state and fetch shortlist when modal opens
  useEffect(() => {
    if (open) {
      setSearchTerm('');
      setDisplayedItems([]); // Clear previous search results
      setError(null);
      setLoadingSearch(false); // Reset search loading
      setActionLoading(null);
      fetchShortlist(); // Fetch the shortlist
    }
  }, [open, fetchShortlist]); // Depend on open and fetchShortlist callback

  // Debounced search effect
  useEffect(() => {
    const handler = setTimeout(() => {
      if (searchTerm.trim().length >= MIN_SEARCH_LENGTH) {
        handleSearch();
      } else {
        setDisplayedItems([]); // Clear results if search term is too short
      }
    }, DEBOUNCE_DELAY);

    return () => {
      clearTimeout(handler); // Cleanup timeout on unmount or searchTerm change
    };
  }, [searchTerm, itemType]); // Rerun effect when searchTerm or itemType changes

  // Search Spotify function
  const handleSearch = useCallback(async () => {
    if (searchTerm.trim().length < MIN_SEARCH_LENGTH) return;

    setLoadingSearch(true); // Use specific loading state
    setError(null);
    try {
      // Ensure itemType is one of the valid types for searchSpotify
      const validSearchTypes: ('track' | 'artist' | 'album')[] = [itemType];
      const results = await searchSpotify(searchTerm, validSearchTypes, 20);

      let spotifyResults: DisplayListItem[] = [];

      // Map results based on the searched itemType and explicitly cast
      if (itemType === 'track' && results.tracks) {
        spotifyResults = results.tracks.map(track => ({ ...track, type: 'track' } as DisplayListItem));
      } else if (itemType === 'artist' && results.artists) {
        spotifyResults = results.artists.map(artist => ({ ...artist, type: 'artist' } as DisplayListItem));
      } else if (itemType === 'album' && results.albums) {
        spotifyResults = results.albums.map(album => ({ ...album, type: 'album' } as DisplayListItem));
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
      setLoadingSearch(false); // Use specific loading state
    }
  }, [searchTerm, itemType]);

  // Add item to shortlist (as candidate)
  const handleAddCandidate = async (item: DisplayListItem) => {
    // item here is guaranteed to be DisplayListItem, so item.type is safe
    if (!item.id || !candidateMonthYear) {
        console.error("Cannot add candidate: Missing ID or month context", item);
        setError("Cannot add candidate: Missing required information.");
        return;
    }
    const loadingId = item.id; // Use Spotify ID for loading indicator
    setActionLoading(loadingId);
    setError(null);

    try {
      // Call backend API to add as candidate
      const addedSelection: UserSelection = await addSelectionCandidate(item.id, item.type, candidateMonthYear, targetCandidateRole);

      // Create the new item with selection details from the backend response
      const newItem: DisplayListItem = {
        ...item, // Spread the original item details (name, images, etc.)
        selectionId: addedSelection.id, // Use the DB selection ID
        selectionRole: addedSelection.selection_role, // Use the role from DB
      };

      // Add to local shortlist state
      setShortlistItems(prev => {
        // Avoid adding duplicates if already shortlisted (e.g., from initial load)
        if (prev.some(shortlistItem => shortlistItem.id === newItem.id)) {
          return prev;
        }
        return [...prev, newItem];
      });

    } catch (err: any) {
      console.error("Error adding candidate:", err);
      if (err instanceof SpotifyAuthError) {
        setError("Please reconnect your Spotify account on the main page");
      } else {
        setError(`Failed to add candidate: ${err.message}`);
      }
    } finally {
      setActionLoading(null); // Clear loading indicator for this item
    }
  };

  // Select item as the main Muse/Ick for the month
  const handleSelectMain = async (item: DisplayListItem) => {
    if (monthIndex === null || !candidateMonthYear) {
        console.error("Cannot select for month: monthIndex or monthYear is invalid.");
        setError("Cannot select for month: Invalid month context.");
        return;
    }
    const loadingId = item.selectionId || item.id; // Use selectionId if available, otherwise Spotify ID
    setActionLoading(loadingId);
    setError(null);

    try {
        let finalItem = item;
        // If the item doesn't have a selectionId, it means it wasn't even a candidate yet.
        // Add it as a candidate first. item.type is safe here.
        if (!item.selectionId) {
            if (!item.id) { // Type check removed as item is DisplayListItem
                throw new Error("Missing Spotify ID for selection.");
            }
            const addedSelection = await addSelectionCandidate(item.id, item.type, candidateMonthYear, targetCandidateRole);
            finalItem = { ...item, selectionId: addedSelection.id, selectionRole: addedSelection.selection_role };
            // Update shortlist state immediately if it wasn't there before
            setShortlistItems(prev => {
               if (!prev.some(i => i.id === finalItem.id)) return [...prev, finalItem];
               return prev.map(i => i.id === finalItem.id ? finalItem : i); // Update if exists
            });
        }

        // Now update the role to the target selected role (muse_selected or ick_selected)
        const updatedSelection = await updateSelection(finalItem.selectionId!, {
            selection_role: targetSelectedRole,
        });

        // Prepare the item data to pass back to the grid
        const selectedItem: DisplayListItem = {
            ...finalItem, // Keep original Spotify details
            selectionId: updatedSelection.id, // Use the potentially updated ID from backend
            selectionRole: updatedSelection.selection_role, // Use the updated role
            // Ensure spotify_item_id from backend is used if available, otherwise keep original id
            id: updatedSelection.spotify_item_id || finalItem.id,
        };

        // Call the callback prop to update the parent grid
        onSelectReplacement(selectedItem, monthIndex);
        onClose(); // Close the modal on success

    } catch (err: any) {
        console.error("Error selecting item:", err);
        if (err instanceof SpotifyAuthError) {
          setError("Please reconnect your Spotify account on the main page");
        } else {
          setError(`Failed to select item: ${err.message}`);
        }
        setActionLoading(null); // Clear loading only on error, success closes modal
    }
  };

  // Helper checks
  const isShortlisted = (itemId: string) => shortlistItems.some(item => item.id === itemId && item.selectionId); // Check for selectionId to confirm it's a DB entry
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
          {/* Show loading indicator for shortlist */}
          {loadingShortlist && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {/* Show action loading indicator OR general error */}
          {!loadingShortlist && actionLoading && shortlistItems.some(item => item.id === actionLoading || item.selectionId === actionLoading) &&
            <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />
          }
          {!loadingShortlist && error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
          {/* Show empty message only if not loading and no error */}
          {!loadingShortlist && !error && shortlistItems.length === 0 && !actionLoading && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No {itemType}s shortlisted yet for {monthName}. Use search to add items.
            </Typography>
          )}
          {shortlistItems.length > 0 && (
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1, maxHeight: '60vh' }}>
              {shortlistItems.map((item) => (
                <ListItem key={item.selectionId || item.id} // Use selectionId if available for key
                  secondaryAction={
                    isCurrentSelection(item.id)
                      ? ( <Chip icon={<StarIcon />} label="Current" size="small" color="secondary" variant="outlined" /> )
                      : ( <Button size="small" variant="outlined" onClick={() => handleSelectMain(item)} disabled={!!actionLoading && actionLoading === (item.selectionId || item.id)}
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
          {/* Show search loading indicator */}
          {loadingSearch && <CircularProgress size={24} sx={{ alignSelf: 'center', my: 2 }} />}
          {/* Show no results message only if not loading search */}
          {!loadingSearch && displayedItems.length === 0 && searchTerm && searchTerm.length >= MIN_SEARCH_LENGTH && (
            <Typography color="text.secondary" sx={{ textAlign: 'center', mt: 2 }}>
              No {itemType}s found for "{searchTerm}".
            </Typography>
          )}
          {!loadingSearch && displayedItems.length > 0 && ( // Use loadingSearch state
            <List dense sx={{ flexGrow: 1, overflowY: 'auto', bgcolor: 'background.paper', borderRadius: 1, maxHeight: '60vh' }}>
              {displayedItems.map((item: DisplayListItem) => ( // Add type annotation
                <ListItem key={item.id}
                  secondaryAction={
                    isShortlisted(item.id)
                      ? ( <Chip label="Added" size="small" variant="outlined" /> )
                      : ( <IconButton edge="end" aria-label="add to shortlist"
                          onClick={() => handleAddCandidate(item)}
                          disabled={!!actionLoading && actionLoading === item.id}
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
