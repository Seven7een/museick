import { SpotifyGridItem } from '@/types/spotify.types';
import { GridMode, GridItemType } from '@/types/spotify.types';

const BASE_URL = '/api'; // Use relative path for proxy

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

  if (!jwt) {
    console.error(`Attempted to call backend API endpoint ${endpoint} without JWT.`);
    throw new Error("Authentication token is missing.");
  }

  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${jwt}`);
  if (options.body && !(options.body instanceof FormData)) { // Don't set Content-Type for FormData
      headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMsg = `Backend API request failed: ${response.status} ${response.statusText}`;
      try {
        const errorBody = await response.json();
        errorMsg += ` - ${errorBody.error || JSON.stringify(errorBody)}`;
      } catch (e) {
        // Ignore if response body is not JSON or empty
      }
      console.error(`Error fetching ${url}: ${errorMsg}`);
      throw new Error(errorMsg);
    }

    // Handle 204 No Content specifically
    if (response.status === 204) {
        return undefined as T; // Handle No Content
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Network or other error fetching ${url}:`, error);
    throw error; // Re-throw error for caller to handle
  }
};

/**
 * Exchanges the Spotify authorization code for tokens via the backend.
 * Requires Clerk JWT.
 */
export const exchangeSpotifyCode = async (
    code: string,
    code_verifier: string,
    jwt: string | null // Accept JWT
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> => {
    return _fetchBackendApi<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/spotify/exchange-code',
        jwt, // Pass JWT down
        {
            method: 'POST',
            body: JSON.stringify({ code, code_verifier }),
        }
    );
};

/**
 * Calls the backend to refresh the Spotify access token using the stored refresh token.
 * Requires Clerk JWT.
 */
export const refreshSpotifyToken = async (
    jwt: string | null // Accept JWT
): Promise<{ access_token: string; expires_in: number }> => { // Backend only returns access token now
    return _fetchBackendApi<{ access_token: string; expires_in: number }>(
        '/spotify/refresh-token',
        jwt, // Pass JWT down
        {
            method: 'POST',
            // No body needed, backend uses stored refresh token
        }
    );
};


/**
 * Syncs the Clerk user with the backend database.
 * Ensures a user record exists in the backend corresponding to the Clerk user.
 * Requires Clerk JWT.
 */
export const syncUserWithBackend = async (jwt: string | null): Promise<void> => {
    // This endpoint might return 204 No Content on success
    await _fetchBackendApi<void>(
        '/users/sync',
        jwt, // Pass JWT down
        {
            method: 'POST',
            // No body needed, user identified by JWT
        }
    );
};


/**
 * Saves or updates a user's selection for a specific month/year/mode.
 * Requires Clerk JWT.
 */
export const saveUserSelection = async (
    year: number,
    monthIndex: number, // 0-11
    mode: GridMode,
    itemType: GridItemType,
    selectedItem: SpotifyGridItem,
    jwt: string | null // Accept JWT
): Promise<any> => { // Define a proper return type if the backend sends one
    return _fetchBackendApi<any>(
        '/user-selections', // Example endpoint, adjust as needed
        jwt, // Pass JWT down
        {
            method: 'POST', // Or PUT if updating
            body: JSON.stringify({ year, monthIndex, mode, itemType, item: selectedItem }),
        }
    );
};

// TODO: Add other backend API functions here...
