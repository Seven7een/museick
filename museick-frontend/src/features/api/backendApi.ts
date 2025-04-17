// src/features/api/backendApi.ts
import { SpotifyGridItem, SpotifyTrackItem } from '@/types/spotify.types';
import { GridMode, GridItemType } from '@/types/spotify.types';

const BASE_URL = 'http://localhost:8080/api'; // Your Go backend base URL

// --- Private Helper Function ---
/**
 * Performs a fetch request to the backend API, automatically including the Clerk JWT.
 * @param endpoint The specific API endpoint (e.g., '/users/sync').
 * @param jwt The Clerk JWT token (MUST be passed in).
 * @param options Standard Fetch API options (method, headers, body).
 * @returns Promise resolving to the parsed JSON response.
 * @throws Error if the fetch fails, JWT is missing, or the response is not ok.
 */
const _fetchBackendApi = async <T = any>(
    endpoint: string,
    jwt: string | null, // Accept JWT as an argument
    options: RequestInit = {}
): Promise<T> => {

  // Check if a token was actually passed
  if (!jwt) {
    console.error('Authentication token was not provided to _fetchBackendApi.');
    throw new Error('Authentication token is missing. Cannot call backend API.');
  }

  const url = `${BASE_URL}${endpoint}`;
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${jwt}`, // Use the passed-in JWT
  };
  const config: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers, // Allow overriding default headers
    },
  };

  try {
    const response = await fetch(url, config);
    if (!response.ok) {
      let errorMsg = `Backend API Error: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMsg = errorBody?.error || errorMsg;
      } catch (e) { /* Ignore */ }
      console.error(`Backend fetch failed for ${url}: ${errorMsg}`);
      throw new Error(errorMsg);
    }
    if (response.status === 204) {
        return undefined as T; // Handle No Content
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Network or other error fetching ${url}:`, error);
    throw error; // Re-throw error for caller to handle
  }
};

// --- Public API Functions (Accept JWT) ---

/**
 * Exchanges the Spotify authorization code for tokens via the backend.
 * Requires Clerk JWT.
 */
export const exchangeSpotifyCode = async (
    code: string,
    code_verifier: string,
    jwt: string | null // Accept JWT
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> => {
    // Ensure JWT is passed down
    return _fetchBackendApi<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/spotify/exchange-code', // Your backend endpoint
        jwt, // Pass JWT down
        {
            method: 'POST',
            body: JSON.stringify({ code, code_verifier }),
        }
    );
};

/**
 * Sends the Clerk JWT to the backend to synchronize the user (create if not exists).
 * Requires Clerk JWT.
 */
export const syncUserWithBackend = async (
    jwt: string | null // Accept JWT
): Promise<void> => {
    // Ensure JWT is passed down
    return _fetchBackendApi<void>(
        '/users/sync', // Your backend endpoint
        jwt, // Pass JWT down
        {
            method: 'POST', // Or 'PUT' depending on your API design
            // No body needed if JWT contains all necessary info (like 'sub')
        }
    );
};

/**
 * Example: Saves a monthly selection to the backend.
 * Requires Clerk JWT.
 */
export const saveMonthlySelection = async (
    year: number,
    monthIndex: number,
    mode: GridMode,
    itemType: GridItemType,
    selectedItem: SpotifyGridItem,
    jwt: string | null // Accept JWT
): Promise<void> => {
    // Ensure JWT is passed down
    return _fetchBackendApi<void>(
        '/selections', // Your backend endpoint
        jwt, // Pass JWT down
        {
            method: 'POST', // Or PUT
            body: JSON.stringify({ year, monthIndex, mode, itemType, item: selectedItem }),
        }
    );
};

// Add other backend API functions here...
