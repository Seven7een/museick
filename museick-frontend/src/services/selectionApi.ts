import { UserSelection, SelectionRole } from '@/types/museick.types';
import { GridItemType } from '@/types/spotify.types';
import { SpotifyAuthError } from '@/features/spotify/spotifyApi';

// TODO: Take all this and put it into the backend API file

// Helper function to add both Clerk and Spotify tokens to headers
const getAuthHeaders = async (jwt: string): Promise<HeadersInit> => {
    const spotifyToken = sessionStorage.getItem('spotify_access_token');
    return {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
        'X-Spotify-Token': spotifyToken || '',
    };
};

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

const API_BASE_URL = import.meta.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8080/api';

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
  const response = await fetch(`${API_BASE_URL}/selections`, {
    method: 'POST',
    headers: await getAuthHeaders(token),
    body: JSON.stringify({
      spotify_item_id: spotifyId, // Renamed from spotify_id
      item_type: itemType, // Renamed from spotify_type, ensure itemType is 'track', 'album', or 'artist'
      month_year: monthYear,
      selection_role: role,
    }),
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`API Error (${response.status}) adding selection:`, data);
    
    // Handle specific error cases
    if (response.status === 401) {
      if (data.error?.includes('Spotify')) {
        throw new SpotifyAuthError('Failed to authenticate with Spotify. Please ensure your account is linked.');
      }
      throw new Error('Authentication required');
    }
    
    if (response.status === 400) {
      throw new Error(`Invalid selection data: ${data.error}`);
    }
    
    throw new Error(data.error || `Failed to add selection (status ${response.status})`);
  }

  return data as UserSelection;
}

/**
 * Lists all selections for a given month.
 */
export async function listSelectionsForMonth(monthYear: string): Promise<UserSelection[]> {
  const token = await getAuthToken();
  const url = `${API_BASE_URL}/selections/${monthYear}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: await getAuthHeaders(token),
  });

  const data = await response.json();

  if (!response.ok) {
     console.error(`API Error (${response.status}) listing selections:`, data);
    throw new Error(data.error || `Failed to list selections for ${monthYear} (status ${response.status})`);
  }
  return data as UserSelection[];
}

/**
 * Updates a selection's role and/or notes.
 */
export async function updateSelection(
  selectionId: string, // MongoDB ObjectID
  updates: { selection_role?: SelectionRole; notes?: string }
): Promise<UserSelection> {
   const token = await getAuthToken();
   if (!updates || (updates.selection_role === undefined && updates.notes === undefined)) {
    throw new Error("UpdateSelection requires 'selection_role' or 'notes' in updates object.");
  }

  const url = `${API_BASE_URL}/selections/${selectionId}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: await getAuthHeaders(token),
    body: JSON.stringify(updates),
  });

  const data = await response.json();

  if (!response.ok) {
     console.error(`API Error (${response.status}) updating selection:`, data);
    throw new Error(data.error || `Failed to update selection ${selectionId} (status ${response.status})`);
  }
  console.log('Selection updated:', data);
  return data as UserSelection;
}

/**
 * Deletes a selection.
 */
export async function deleteSelection(selectionId: string): Promise<boolean> {
   const token = await getAuthToken();
  const url = `${API_BASE_URL}/selections/${selectionId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: await getAuthHeaders(token),
  });

  if (response.status === 204) {
    console.log(`Selection ${selectionId} deleted successfully.`);
    return true;
  }

  // Handle potential errors with JSON body
  let errorData = { error: `Failed to delete selection (status ${response.status})` };
  try {
      if (response.headers.get('content-type')?.includes('application/json')) {
          errorData = await response.json();
      }
  } catch (e) {
      console.warn("Could not parse error JSON on delete:", e);
  }

  console.error(`API Error (${response.status}) deleting selection:`, errorData);
  throw new Error(errorData.error);
}
