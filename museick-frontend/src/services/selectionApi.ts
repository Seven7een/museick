import { UserSelection, SelectionRole } from '@/types/museick.types';
import { GridItemType } from '@/types/spotify.types';
import { SpotifyAuthError } from '@/features/spotify/spotifyApi';
import { fetchBackendApi } from '@/features/api/backendApi';

/**
 * Adds an item as a candidate for a given month and role.
 */
export async function addSelectionCandidate(
  spotifyId: string,
  itemType: GridItemType,
  monthYear: string,
  role: SelectionRole
): Promise<UserSelection> {
  try {
    return await fetchBackendApi<UserSelection>(
      '/selections',
      {
        method: 'POST',
        body: JSON.stringify({
          spotify_item_id: spotifyId,
          item_type: itemType,
          month_year: monthYear,
          selection_role: role,
        }),
      }
    );
  } catch (error) {
    if (error instanceof Error && error.message.includes('Spotify')) {
      throw new SpotifyAuthError('Failed to authenticate with Spotify. Please ensure your account is linked.');
    }
    throw error;
  }
}

/**
 * Lists all selections for a given month.
 */
export async function listSelectionsForMonth(monthYear: string): Promise<UserSelection[]> {
  return fetchBackendApi<UserSelection[]>(
    `/selections/${monthYear}`,
    { method: 'GET' }
  );
}

/**
 * Updates a selection's role and/or notes.
 */
export async function updateSelection(
  selectionId: string,
  updates: { selection_role?: SelectionRole; notes?: string }
): Promise<UserSelection> {
  if (!updates || (updates.selection_role === undefined && updates.notes === undefined)) {
    throw new Error("UpdateSelection requires 'selection_role' or 'notes' in updates object.");
  }

  return fetchBackendApi<UserSelection>(
    `/selections/${selectionId}`,
    {
      method: 'PUT',
      body: JSON.stringify(updates),
    }
  );
}

/**
 * Deletes a selection.
 */
export async function deleteSelection(selectionId: string): Promise<boolean> {
  try {
    await fetchBackendApi<void>(
      `/selections/${selectionId}`,
      { method: 'DELETE' }
    );
    console.log(`Selection ${selectionId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error('Error deleting selection:', error);
    throw error;
  }
}
