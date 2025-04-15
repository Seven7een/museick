// src/components/yearly/YearlySelectionGrid.tsx // Corrected path comment
import React, { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import Grid from '@mui/material/Grid';

import MonthSlot from '@/components/yearly/MonthSlot'; // Correct import name and path
import SelectionReplaceModal from '@/components/yearly/SelectionReplaceModal'; // Correct import name and path
import { SpotifyGridItem, GridMode, GridItemType } from '@/types/spotify.types';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- Helper to Generate Initial Placeholder Data for 12 Months ---
const generateInitialYearlyPlaceholders = (year: number, itemType: GridItemType): (SpotifyGridItem | undefined)[] => {
  return MONTHS.map((monthName, index) => {
    if ((index + year) % 4 === 0) return undefined;
    const i = index;
    switch (itemType) {
      case 'artist':
        return { type: 'artist', id: `spotify:artist:${year}-${i}`, name: `Artist for ${monthName}`, images: [{ url: `https://picsum.photos/seed/a${year}${i}/150/150` }], genres: ['placeholder'], external_urls: { spotify: '#' } } as SpotifyGridItem;
      case 'album':
        return { type: 'album', id: `spotify:album:${year}-${i}`, name: `Album for ${monthName}`, artists: [{ name: `Artist ${i}` }], images: [{ url: `https://picsum.photos/seed/b${year}${i}/150/150` }], release_date: `${year}-01-01`, external_urls: { spotify: '#' } } as SpotifyGridItem;
      case 'track':
      default:
        return { type: 'track', id: `spotify:track:${year}-${i}`, name: `Track for ${monthName}`, artists: [{ name: `Artist ${i}` }], album: { id: `spotify:album:${year}-${i}`, name: `Album ${i}`, images: [{ url: `https://picsum.photos/seed/t${year}${i}/150/150` }] }, external_urls: { spotify: '#' }, preview_url: i % 2 !== 0 ? `https://p.scdn.co/mp3-preview/t${year}${i}` : null } as SpotifyGridItem;
    }
  });
};

// --- Component Props ---
interface YearlySelectionGridProps {
  mode: GridMode;
  itemType: GridItemType;
  year: number;
}

// --- Corrected Component Name ---
const YearlySelectionGrid: React.FC<YearlySelectionGridProps> = ({ mode, itemType, year }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingMonthIndex, setEditingMonthIndex] = useState<number | null>(null);
  const [monthlyItems, setMonthlyItems] = useState<(SpotifyGridItem | undefined)[]>([]);

  // --- Effect to Initialize/Fetch Data ---
  useEffect(() => {
    console.log(`GRID INIT/FETCH: Year=${year}, Mode=${mode}, Type=${itemType}`);
    // TODO: Replace with actual backend data fetching
    setMonthlyItems(generateInitialYearlyPlaceholders(year, itemType));
  }, [mode, itemType, year]);

  // --- Modal Handlers ---
  const handleOpenReplaceModal = (monthIndex: number) => {
    console.log(`Request to replace ${itemType} for ${MONTHS[monthIndex]} ${year}`);
    setEditingMonthIndex(monthIndex);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMonthIndex(null);
  };

  // --- Handler for replacement selection ---
  const handleSelectReplacement = (monthIndex: number, newItem: SpotifyGridItem) => {
    console.log(`MOCK: Updating ${mode} ${itemType} for ${MONTHS[monthIndex]} ${year} with ${newItem.name} (Backend Call)...`);
    setMonthlyItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems[monthIndex] = newItem;
      return updatedItems; // Return the updated array
    });
    // Modal closing is handled within the modal component
  };

  // --- Determine Grid Title ---
  const modeTitle = mode === 'favorite' ? 'Muses' : 'Icks';
  const typeTitle = itemType.charAt(0).toUpperCase() + itemType.slice(1) + 's';
  const gridTitle = `${year} ${modeTitle}: ${typeTitle}`;

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Typography variant="h5" component="h2" gutterBottom align="center">
        {gridTitle}
      </Typography>
      <Grid container spacing={2}>
        {MONTHS.map((monthName, index) => {
          const item = monthlyItems[index];
          return (
            <Grid key={`${year}-${monthName}-${mode}-${itemType}`} size={{xs: 6, md: 3}}>
              {/* Use Corrected Component Name and Props */}
              <MonthSlot
                monthIndex={index}
                monthName={monthName}
                mode={mode}
                itemType={itemType}
                onSlotClick={handleOpenReplaceModal}
                itemData={item}
                ariaLabel={`${monthName} ${year} ${modeTitle} ${itemType} slot${item ? `: ${item.name}` : ''}`}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Render the Modal with Corrected Component Name and Props */}
      <SelectionReplaceModal
         open={modalOpen}
         onClose={handleCloseModal}
         monthIndex={editingMonthIndex}
         monthName={editingMonthIndex !== null ? MONTHS[editingMonthIndex] : ''}
         year={year}
         currentItem={editingMonthIndex !== null ? monthlyItems[editingMonthIndex] : undefined}
         onSelectReplacement={handleSelectReplacement}
         mode={mode}
         itemType={itemType}
      />
    </Box>
  );
};

// --- Corrected Export ---
export default YearlySelectionGrid;
