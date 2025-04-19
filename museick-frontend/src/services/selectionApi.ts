import { UserSelection, SelectionRole } from '@/types/museick.types';
import { GridItemType } from '@/types/spotify.types';
import { SpotifyAuthError } from '@/features/spotify/spotifyApi';
import { fetchBackendApi } from '@/features/api/backendApi';

let getTokenFunction: (() => Promise<string | null>) | null = null;

export function initializeAuthToken(getToken: () => Promise<string | null>) {
  getTokenFunction = getToken;
}

async function getAuthToken() {
  if (!getTokenFunction) {
    console.error('Auth token getter not initialized. Call initializeAuthToken first.');
    throw new Error('Authentication not properly initialized');
  }
  const token = await getTokenFunction();
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
}

/**
 * Adds an item as a candidate for a given month and role.
 */
export async function addSelectionCandidate(
  spotifyId: string,
  itemType: GridItemType,
  monthYear: string,
  role: SelectionRole
): Promise<UserSelection> {
  const token = await getAuthToken();
  try {
    return await fetchBackendApi<UserSelection>(
      '/selections',
      token,
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
  const token = await getAuthToken();
  return fetchBackendApi<UserSelection[]>(
    `/selections/${monthYear}`,
    token,
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
  const token = await getAuthToken();
  if (!updates || (updates.selection_role === undefined && updates.notes === undefined)) {
    throw new Error("UpdateSelection requires 'selection_role' or 'notes' in updates object.");
  }

  return fetchBackendApi<UserSelection>(
    `/selections/${selectionId}`,
    token,
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
  const token = await getAuthToken();
  try {
    await fetchBackendApi<void>(
      `/selections/${selectionId}`,
      token,
      { method: 'DELETE' }
    );
    console.log(`Selection ${selectionId} deleted successfully.`);
    return true;
  } catch (error) {
    console.error('Error deleting selection:', error);
    throw error;
  }
}
