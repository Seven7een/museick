import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Fab, IconButton, Collapse, useTheme } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import CloseIcon from '@mui/icons-material/Close';
import { FastAverageColor } from 'fast-average-color';

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
  const [dominantColor, setDominantColor] = useState<string | null>(null);

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

  // Extract dominant color from image
  useEffect(() => {
    if (imageUrl) {
      const fac = new FastAverageColor();
      fac.getColorAsync(imageUrl)
        .then(color => setDominantColor(color.rgba))
        .catch(() => setDominantColor(null));
    }
  }, [imageUrl]);

  return (
    <Paper
      elevation={3}
      sx={{
        position: 'relative',
        aspectRatio: '1',
        width: '100%',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: 'grey.200', // Fallback color when no image
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: 'translateY(0)',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
        },
        '&::after': itemData ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: mode === 'muse' 
            ? `linear-gradient(to right, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`
            : `linear-gradient(to right, ${theme.palette.primary.dark}, ${theme.palette.secondary.dark})`,
          opacity: 0,
          transition: 'opacity 0.3s ease',
        } : {},
        '&:hover::after': {
          opacity: 1,
        },
        // Add subtle sparkle effect for muse items
        '&::before': mode === 'muse' && itemData ? {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle at 50% 50%, rgba(0, 255, 178, 0.1) 0%, transparent 50%)',
          mixBlendMode: 'overlay',
          opacity: 0,
          transition: 'opacity 0.3s ease',
        } : {},
        '&:hover::before': mode === 'muse' && itemData ? {
          opacity: 1,
        } : {},
      }}
    >
      {/* Background Image Container */}
      {itemData && (
        <Box
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
            '&::before': {
              content: '""',
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '20%',
              background: dominantColor 
                ? `linear-gradient(to top, ${dominantColor.replace(')', ', 0.6)')}, transparent)`
                : 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)',
              zIndex: 2,
              transition: 'background 0.3s ease',
            },
          }}
        >
          <img
            src={getImageUrl(itemData)}
            alt={itemData.name}
            loading="lazy"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
            }}
          />
        </Box>
      )}

      {/* Content Container */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 2,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'flex-end', // Push content to bottom
        }}
      >
        {/* Click Target Area (top 80%) */}
        <Box 
          onClick={handleImageClick}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '80%',
            cursor: 'pointer',
          }}
        >
          {!imageUrl && <PlaceholderIcon sx={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '3rem', color: 'grey.400' }} />}
          {canPlay && (
            <Fab
              className="fab-play"
              color="primary"
              size="small"
              aria-label="Play snippet"
              onClick={handlePlayClick}
              sx={{
                position: 'absolute',
                bottom: 8,
                right: 8,
                opacity: 0,
                transition: 'opacity 0.2s ease-in-out',
                '&:hover': { opacity: 1 }
              }}
            >
              <PlayArrowIcon />
            </Fab>
          )}
        </Box>

        {/* Bottom Info Bar (20%) */}
        <Box
          onClick={handleToggleExpand}
          sx={{
            p: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            position: 'relative',
            minHeight: '20%',
            backgroundColor: dominantColor 
              ? `${dominantColor.replace(')', ', 0.3)')}` 
              : 'rgba(0, 0, 0, 0.2)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            zIndex: 1,
            transition: 'all 0.3s ease',
            '&:hover': {
              backgroundColor: dominantColor 
                ? `${dominantColor.replace(')', ', 0.4)')}` 
                : 'rgba(0, 0, 0, 0.3)',
            },
          }}
          aria-expanded={isExpanded}
          aria-controls={`item-details-${monthIndex}`}
        >
          <Box sx={{ overflow: 'hidden', mr: 1 }}>
            <Typography variant="caption" noWrap fontWeight="medium" sx={{ color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              {itemData ? primaryText : monthName}
            </Typography>
            {itemData && (
              <Typography variant="caption" display="block" noWrap sx={{ color: 'rgba(255,255,255,0.7)', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                {secondaryText}
              </Typography>
            )}
          </Box>
          <IconButton 
            size="small" 
            aria-label={isExpanded ? 'Collapse details' : 'Expand details'}
            sx={{ color: 'white' }}
          >
            {isExpanded ? <ExpandMoreIcon /> : <ExpandLessIcon />}
          </IconButton>
        </Box>

        {/* Expanded Details Section */}
        <Collapse in={isExpanded} timeout="auto" unmountOnExit>
          <Box
            id={`item-details-${monthIndex}`}
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              bgcolor: 'rgba(0, 0, 0, 0.85)',
              color: 'white',
              zIndex: 3,
              p: 2,
              pt: 8,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <IconButton
              aria-label="Close details"
              onClick={handleToggleExpand}
              size="small"
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                color: 'white',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                backdropFilter: 'blur(4px)',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                },
                zIndex: 4,
              }}
            >
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
      </Box>
    </Paper>
  );
};

export default MonthSlot;
