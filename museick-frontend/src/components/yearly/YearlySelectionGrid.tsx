import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import Grid from '@mui/material/Grid';

import MonthSlot from '@/components/yearly/MonthSlot';
import { SelectionReplaceModal } from '@/components/yearly/SelectionReplaceModal';
import { SpotifyGridItem, GridMode, GridItemType } from '@/types/spotify.types';
import { SelectionRole } from '@/types/museick.types';
import { listSelectionsForMonth } from '@/services/selectionApi';
import { getSpotifyItemDetails } from '@/features/spotify/spotifyApi';

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
  // State holds the selected item for each month, potentially undefined
  const [monthlySelectedItems, setMonthlySelectedItems] = useState<(SpotifyGridItem | undefined)[]>(Array(12).fill(undefined));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Determine target selected role based on mode ---
  const targetSelectedRole: SelectionRole = mode === 'muse' ? 'muse_selected' : 'ick_selected';

  // --- Effect to Initialize/Fetch Data ---
  const fetchMonthlySelections = useCallback(async () => {
    setLoading(true);
    setError(null);
    console.log(`GRID FETCH: Year=${year}, Mode=${mode}, Type=${itemType}, Role=${targetSelectedRole}`);

    try {
      const promises = MONTHS.map(async (_, index) => {
        const month = (index + 1).toString().padStart(2, '0');
        const monthYear = `${year}-${month}`;
        try {
          const selections = await listSelectionsForMonth(monthYear);
          const selectedEntry = selections.find(sel => sel.selection_role === targetSelectedRole && sel.item_type === itemType);

          if (selectedEntry) {
            const itemDetails = await getSpotifyItemDetails(selectedEntry.spotify_item_id, itemType);
            // Augment itemDetails with selection info
            itemDetails.selectionId = selectedEntry.id;
            itemDetails.selectionRole = selectedEntry.selection_role;
            return itemDetails;
          }
          return undefined; // No selection found for this month/role/type
        } catch (monthError: any) {
          console.error(`Error fetching selections for ${monthYear}:`, monthError);
          // Return undefined for this month on error, maybe set a specific error state later
          return undefined;
        }
      });

      const results = await Promise.all(promises);
      setMonthlySelectedItems(results);
    } catch (err: any) {
      console.error("Error fetching yearly selections:", err);
      setError(err.message || 'Failed to load yearly selections.');
      setMonthlySelectedItems(Array(12).fill(undefined)); // Reset on error
    } finally {
      setLoading(false);
    }
  }, [year, mode, itemType, targetSelectedRole]);

  useEffect(() => {
    fetchMonthlySelections();
  }, [fetchMonthlySelections]);

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
  // This is called when the modal confirms a selection via its onSelectReplacement prop
  const handleSelectReplacement = (newItemFromModal: SpotifyGridItem | null, monthIndex: number | null) => {
    // Check if monthIndex is valid and an item was actually selected
    if (monthIndex === null || newItemFromModal === null) {
      console.log("GRID: Modal closed without selection or invalid month index.");
      return;
    }

    console.log(`GRID: Updating ${mode} ${itemType} for ${MONTHS[monthIndex]} ${year} with ${newItemFromModal.name}`);
    // newItemFromModal should now have selectionId and selectionRole set by the modal/API call

    setMonthlySelectedItems(prevItems => {
      const updatedItems = [...prevItems];
      // Ensure the role matches the grid's mode (muse_selected or ick_selected)
      // The modal should have already set the correct role (e.g., muse_selected)
      if (newItemFromModal.selectionRole === targetSelectedRole) {
         updatedItems[monthIndex] = newItemFromModal;
      } else {
         // This case might happen if the modal logic has an issue or returns an unexpected role
         console.warn(`Selected item role (${newItemFromModal.selectionRole}) doesn't match grid mode (${targetSelectedRole}). Clearing slot.`);
         updatedItems[monthIndex] = undefined;
      }
      return updatedItems;
    });
    // Re-fetch might be needed if the modal doesn't return full updated data,
    // but for now, assume newItemFromModal is sufficient for display.
    // fetchMonthlySelections(); // Optionally re-fetch to ensure consistency
  };

  // --- Determine Grid Title ---
  const modeTitle = mode === 'muse' ? 'Muses' : 'Icks';
  const typeTitle = itemType.charAt(0).toUpperCase() + itemType.slice(1) + 's';
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>;
  }

  return (
    <Box sx={{ width: '100%', mb: 4 }}>
      <Grid container spacing={2}>
        {MONTHS.map((monthName, index) => {
          const item = monthlySelectedItems[index]; // Use fetched selected items
          return (
            <Grid key={`${year}-${monthName}-${mode}-${itemType}`} size={{xs: 6, md: 3}}>
              <MonthSlot
                monthIndex={index}
                monthName={monthName}
                mode={mode} // Pass 'muse' or 'ick'
                itemType={itemType}
                onSlotClick={handleOpenReplaceModal}
                itemData={item} // Pass the potentially undefined selected item
                ariaLabel={`${monthName} ${year} ${modeTitle} ${itemType} slot${item ? `: ${item.name}` : ''}`}
              />
            </Grid>
          );
        })}
      </Grid>

      {/* Render the Modal */}
      {editingMonthIndex !== null && ( // Conditionally render modal only when needed
          <SelectionReplaceModal
             open={modalOpen}
             onClose={handleCloseModal}
             monthIndex={editingMonthIndex}
             monthName={MONTHS[editingMonthIndex]}
             year={year}
             // Pass the current *selected* item for this slot (could be undefined)
             currentItem={monthlySelectedItems[editingMonthIndex]}
             onSelectReplacement={handleSelectReplacement}
             mode={mode} // Pass 'muse' or 'ick'
             itemType={itemType}
          />
      )}
    </Box>
  );
};

// --- Corrected Export ---
export default YearlySelectionGrid;
