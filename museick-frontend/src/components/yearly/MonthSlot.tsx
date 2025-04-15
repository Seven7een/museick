// src/components/yearly/MonthSlot.tsx // Corrected path comment
import React, { useState } from 'react';
import { Box, Paper, Typography, Fab, IconButton, Collapse, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

// Import Union Type and specific types
import { SpotifyGridItem, GridMode, GridItemType } from '@/types/spotify.types';

// --- Corrected Interface Name and Props ---
interface MonthSlotProps {
  monthIndex: number; // Use monthIndex
  monthName: string; // Added monthName
  mode: GridMode;
  itemType: GridItemType;
  onSlotClick: (monthIndex: number) => void; // Expects monthIndex
  itemData?: SpotifyGridItem; // Use the Union Type
  ariaLabel: string;
}

// Helper to get image URL based on item type
const getImageUrl = (itemData?: SpotifyGridItem): string | undefined => {
  if (!itemData) return undefined;
  if ('album' in itemData && itemData.album?.images) { // Track
    return itemData.album.images[itemData.album.images.length - 1]?.url ?? itemData.album.images[0]?.url;
  } else if ('images' in itemData && itemData.images) { // Artist or Album
    return itemData.images[itemData.images.length - 1]?.url ?? itemData.images[0]?.url;
  }
  return undefined;
};

// Helper to get primary text based on item type
const getPrimaryText = (itemData?: SpotifyGridItem, defaultText = 'Select Item'): string => {
    return itemData?.name || defaultText;
};

// Helper to get secondary text based on item type
const getSecondaryText = (itemData?: SpotifyGridItem): string => {
    if (!itemData) return '...';
    if ('artists' in itemData && itemData.artists) { // Track or Album
        return itemData.artists.map(a => a.name).join(', ');
    }
    if ('genres' in itemData && itemData.genres && itemData.genres.length > 0) { // Artist
        return itemData.genres.slice(0, 2).join(', '); // Show first few genres
    }
    return 'Details unavailable';
};

// --- Corrected Component Name and Props Usage ---
const MonthSlot: React.FC<MonthSlotProps> = ({ monthIndex, monthName, mode, itemType, onSlotClick, itemData, ariaLabel }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useTheme();

  const handlePlayClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    if (itemType === 'track' && itemData && 'preview_url' in itemData) {
        // Use monthName in log
        console.log(`Play button clicked for ${monthName}. Preview URL: ${itemData.preview_url}`);
        // TODO: Implement playback
    }
  };

  const handleImageClick = (event: React.MouseEvent) => {
    event.stopPropagation();
     // Use monthName in log
    console.log(`Image area clicked for ${monthName}, triggering modal.`);
    onSlotClick(monthIndex); // Pass monthIndex
  };

  const handleToggleExpand = (event: React.MouseEvent) => {
    event.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  // --- Data Extraction ---
  // Use month name if no item is selected
  const primaryText = getPrimaryText(itemData, monthName);
  const secondaryText = itemData ? getSecondaryText(itemData) : 'No selection';
  const imageUrl = getImageUrl(itemData);
  const canPlay = itemType === 'track' && itemData && 'preview_url' in itemData && !!itemData.preview_url;
  const PlaceholderIcon = itemType === 'artist' ? PersonIcon : itemType === 'album' ? AlbumIcon : MusicNoteIcon;

  return (
    <Paper
      elevation={2}
      sx={{
        aspectRatio: '1 / 1', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
        border: mode === 'leastFavorite' ? `2px solid ${theme.palette.error.light}` : `2px solid transparent`,
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { boxShadow: 3 }, '&:active': { boxShadow: 1 }
      }}
      role="group" aria-label={ariaLabel}
    >
      {/* Top Part (80%) */}
      <Box onClick={handleImageClick} sx={{
          height: '80%', width: '100%', position: 'relative', backgroundColor: 'grey.200',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          '&:hover .fab-play': { opacity: 1 }
        }}>
        {imageUrl ? ( <img src={imageUrl} alt={`Art for ${primaryText}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> )
         : ( <PlaceholderIcon sx={{ fontSize: '3rem', color: 'grey.400' }} /> )}
        {canPlay && ( <Fab className="fab-play" color="primary" size="small" aria-label="Play snippet" onClick={handlePlayClick} sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, opacity: 0.85, transition: 'opacity 0.2s ease-in-out' }}> <PlayArrowIcon /> </Fab> )}
      </Box>

      {/* Bottom Part (20%) */}
      <Box onClick={handleToggleExpand} sx={{
          height: '20%', width: '100%', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}`, cursor: 'pointer',
          zIndex: 1, position: 'relative',
          borderTopLeftRadius: isExpanded ? 0 : theme.shape.borderRadius,
          borderTopRightRadius: isExpanded ? 0 : theme.shape.borderRadius,
          transition: theme.transitions.create(['border-radius'], { duration: theme.transitions.duration.short }),
        }}
        aria-expanded={isExpanded} aria-controls={`item-details-${monthIndex}`} // Use monthIndex
      >
        <Box sx={{ overflow: 'hidden', mr: 1 }}>
          <Typography variant="caption" noWrap fontWeight="medium">
            {itemData ? primaryText : monthName} {/* Show month name if no item */}
          </Typography>
          {itemData && (
            <Typography variant="caption" display="block" noWrap sx={{ color: 'text.secondary' }}>
              {secondaryText}
            </Typography>
          )}
        </Box>
        <IconButton size="small" aria-label={isExpanded ? 'Collapse details' : 'Expand details'}>
          {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* Expanded Details Section */}
      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
        <Box id={`item-details-${monthIndex}`} // Use monthIndex
          sx={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.85)', color: 'white', zIndex: 3,
            p: 2, pt: 8, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          }}
        >
          <IconButton aria-label="Close details" onClick={handleToggleExpand} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 4 }}>
            <CloseIcon fontSize="small"/>
          </IconButton>
          {/* Detailed Info */}
          <Typography variant="h6" gutterBottom>{primaryText}</Typography>
          <Typography variant="body2" gutterBottom>{secondaryText}</Typography>
          {itemData && 'album' in itemData && itemData.album && ( <Typography variant="body2" gutterBottom>Album: {itemData.album.name}</Typography> )}
          {itemData && 'release_date' in itemData && ( <Typography variant="body2" gutterBottom>Released: {itemData.release_date}</Typography> )}
          <Typography variant="body2" gutterBottom>Spotify ID: {itemData?.id || 'N/A'}</Typography>
          <Box sx={{ mt: 'auto', pt: 1 }}>
             <Typography variant="caption" sx={{ color: 'grey.400' }}>{monthName} Details...</Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

// --- Corrected Export ---
export default MonthSlot;
