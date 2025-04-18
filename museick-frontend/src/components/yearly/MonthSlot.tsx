import React, { useState } from 'react';
import { Box, Paper, Typography, Fab, IconButton, Collapse, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';

import { SpotifyGridItem, GridMode, GridItemType, SpotifyImage } from '@/types/spotify.types';

interface MonthSlotProps {
  monthIndex: number;
  monthName: string;
  mode: GridMode;
  itemType: GridItemType;
  onSlotClick: (monthIndex: number) => void;
  itemData?: SpotifyGridItem;
  ariaLabel: string;
}

// Prioritize the first image (largest) or a specific size if needed
const getImageUrl = (itemData?: SpotifyGridItem): string | undefined => {
  if (!itemData) return undefined;

  let images: SpotifyImage[] | undefined;
  if ('images' in itemData) { // Artist or Album
    images = itemData.images;
  } else if ('album' in itemData && itemData.album?.images) { // Track
    images = itemData.album.images;
  }

  if (!images || images.length === 0) return undefined;
  // Prefer the first image (usually largest), fallback to last (smallest)
  return images[0]?.url ?? images[images.length - 1]?.url;
};

const getPrimaryText = (itemData?: SpotifyGridItem, defaultText: string = 'Select Item'): string => {
  if (!itemData) return defaultText;
  return itemData.name;
};

const getSecondaryText = (itemData?: SpotifyGridItem): string => {
  if (!itemData) return 'No selection';
  if ('artists' in itemData && itemData.artists) { // Track or Album
    return itemData.artists.map(a => a.name).join(', ');
  }
  if ('genres' in itemData && itemData.genres && itemData.genres.length > 0) { // Artist
    // Capitalize first letter of each genre for display
    return itemData.genres.map(g => g.charAt(0).toUpperCase() + g.slice(1)).join(', ');
  }
  return 'Artist'; // Fallback for Artist if no genres
};


const MonthSlot: React.FC<MonthSlotProps> = ({
  monthIndex, monthName, mode, itemType, onSlotClick, itemData, ariaLabel
}) => {
  const theme = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const handlePlayClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    // Check if itemType is 'track' and preview_url exists
    if (itemType === 'track' && itemData && 'preview_url' in itemData && itemData.preview_url) {
      console.log(`Play button clicked for ${monthName}. Preview URL: ${itemData.preview_url}`);
      // TODO: Implement playback (e.g., using Howler.js or Web Audio API)
      alert(`Playing preview for: ${itemData.name}`); // Placeholder
    } else {
      console.log(`Play button clicked for ${monthName}, but no preview URL available.`);
    }
  };

  const handleImageClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(`Image area clicked for ${monthName}, triggering modal.`);
    onSlotClick(monthIndex); // Trigger the modal opening logic passed from parent
  };

  const handleToggleExpand = (event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent triggering onSlotClick
    setIsExpanded(!isExpanded);
  };

  const primaryText = getPrimaryText(itemData, monthName);
  const secondaryText = itemData ? getSecondaryText(itemData) : 'No selection';
  const imageUrl = getImageUrl(itemData); // Uses the corrected helper
  // Check if itemType is 'track' and preview_url exists
  const canPlay = itemType === 'track' && itemData && 'preview_url' in itemData && !!itemData.preview_url;

  const PlaceholderIcon = itemType === 'artist' ? PersonIcon : itemType === 'album' ? AlbumIcon : MusicNoteIcon;

  return (
    <Paper
      elevation={isExpanded ? 6 : 2} // Increase elevation when expanded
      sx={{
        aspectRatio: '1 / 1', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative',
        border: mode === 'ick' ? `2px solid ${theme.palette.error.light}` : `2px solid transparent`,
        transition: theme.transitions.create(['border-color', 'box-shadow']),
        '&:hover': { boxShadow: isExpanded ? 6 : 3 }, // Keep higher shadow on hover if expanded
        '&:active': { boxShadow: 1 }
      }}
      role="group" aria-label={ariaLabel}
    >
      {/* Top Part (80%) */}
      <Box onClick={handleImageClick} sx={{
          height: '80%', width: '100%', position: 'relative', backgroundColor: 'grey.200',
          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          overflow: 'hidden', // Ensure image doesn't overflow
          '&:hover .fab-play': { opacity: 1 } // Show play button on hover
        }}>
        {imageUrl ? ( <img src={imageUrl} alt={`Art for ${primaryText}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> )
         : ( <PlaceholderIcon sx={{ fontSize: '3rem', color: 'grey.400' }} /> )}
        {canPlay && ( <Fab className="fab-play" color="primary" size="small" aria-label="Play snippet" onClick={handlePlayClick} sx={{ position: 'absolute', bottom: 8, right: 8, zIndex: 2, opacity: 0.85, transition: 'opacity 0.2s ease-in-out' }}> <PlayArrowIcon /> </Fab> )}
      </Box>

      {/* Bottom Part (20%) */}
      <Box onClick={handleToggleExpand} sx={{ // Make entire bottom bar clickable for expand/collapse
          height: '20%', width: '100%', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: 'background.paper', borderTop: `1px solid ${theme.palette.divider}`, cursor: 'pointer',
          zIndex: 1, position: 'relative',
          borderBottomLeftRadius: isExpanded ? 0 : theme.shape.borderRadius, // Adjust radius based on expansion
          borderBottomRightRadius: isExpanded ? 0 : theme.shape.borderRadius,
          transition: theme.transitions.create(['border-radius'], { duration: theme.transitions.duration.short }),
        }}
        aria-expanded={isExpanded} aria-controls={`item-details-${monthIndex}`}
      >
        <Box sx={{ overflow: 'hidden', mr: 1 }}>
          <Typography variant="caption" noWrap fontWeight="medium">
            {itemData ? primaryText : monthName}
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
        <Box id={`item-details-${monthIndex}`}
          sx={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            bgcolor: 'rgba(0, 0, 0, 0.85)', color: 'white', zIndex: 3,
            p: 2, pt: 8, // Add padding top to avoid overlap with close button
            overflowY: 'auto', display: 'flex', flexDirection: 'column',
            borderRadius: theme.shape.borderRadius, // Match paper's radius
          }}
        >
          <IconButton aria-label="Close details" onClick={handleToggleExpand} size="small" sx={{ position: 'absolute', top: 8, right: 8, color: 'white', zIndex: 4 }}>
            <CloseIcon fontSize="small"/>
          </IconButton>
          {/* Detailed Info */}
          <Typography variant="h6" gutterBottom>{primaryText}</Typography>
          <Typography variant="body2" gutterBottom>{secondaryText}</Typography>
          {itemData && 'album' in itemData && itemData.album && ( <Typography variant="body2" gutterBottom>Album: {itemData.album.name}</Typography> )}
          {itemData && 'release_date' in itemData && itemData.release_date && ( <Typography variant="body2" gutterBottom>Released: {itemData.release_date}</Typography> )}
          {itemData && 'popularity' in itemData && ( <Typography variant="body2" gutterBottom>Popularity: {itemData.popularity}</Typography> )}
          <Typography variant="body2" gutterBottom>Spotify ID: {itemData?.id || 'N/A'}</Typography>
          {/* Add more details as needed */}
          <Box sx={{ mt: 'auto', pt: 1 }}>
             <Typography variant="caption" sx={{ color: 'grey.400' }}>{monthName} Details...</Typography>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default MonthSlot;
