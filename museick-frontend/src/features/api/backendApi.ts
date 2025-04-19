import { SpotifyGridItem } from '@/types/spotify.types';
import { GridMode, GridItemType } from '@/types/spotify.types';

const BASE_URL = '/api';

let getTokenFunction: (() => Promise<string | null>) | null = null;

// --- Helper to manage token refresh state to prevent infinite loops ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempts to refresh the Spotify token using the backend endpoint.
 * Manages concurrent refresh attempts.
 * @returns The new access token, or null if refresh fails.
 */
export const attemptTokenRefresh = async (): Promise<string | null> => {
    if (isRefreshing && refreshPromise) {
        console.log("Token refresh already in progress, waiting...");
        return refreshPromise;
    }
    if (isRefreshing && !refreshPromise) {
        console.warn("Refresh state inconsistent, blocking new refresh.");
        return null;
    }

    isRefreshing = true;
    console.log("Attempting Spotify token refresh via backend...");

    refreshPromise = (async () => {
        try {
            const refreshResponse = await refreshSpotifyToken();
            const newAccessToken = refreshResponse.access_token;

            if (newAccessToken) {
                console.log("Spotify token refreshed successfully. Storing new token.");
                localStorage.setItem('spotify_access_token', newAccessToken);
                return newAccessToken;
            } else {
                throw new Error("Backend refresh response did not contain access_token.");
            }
        } catch (refreshError) {
            console.error("Spotify token refresh failed:", refreshError);
            localStorage.removeItem('spotify_access_token');
            window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
            return null;
        } finally {
            isRefreshing = false;
            refreshPromise = null;
        }
    })();

    return refreshPromise;
};

export function initializeAuthToken(getToken: () => Promise<string | null>) {
  getTokenFunction = getToken;
}

async function getAuthToken(): Promise<string> {
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
 * Performs a fetch request to the backend API, automatically including the Clerk JWT and Spotify token.
 */
const _fetchBackendApi = async <T = any>(
    endpoint: string,
    options: RequestInit = {}
): Promise<T> => {
  const jwt = await getAuthToken();
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  
  // Add Clerk JWT
  headers.set('Authorization', `Bearer ${jwt}`);
  
  // Add Spotify token if available
  const spotifyToken = localStorage.getItem('spotify_access_token');
  if (spotifyToken) {
    headers.set('X-Spotify-Token', spotifyToken);
  }
  
  // Set content type for JSON bodies
  if (options.body && !(options.body instanceof FormData)) {
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
      return undefined as T;
    }
    return await response.json() as T;
  } catch (error) {
    console.error(`Network or other error fetching ${url}:`, error);
    throw error;
  }
};

export const fetchBackendApi = _fetchBackendApi;

/**
 * Exchanges the Spotify authorization code for tokens via the backend.
 */
export const exchangeSpotifyCode = async (
    code: string,
    code_verifier: string,
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> => {
    return _fetchBackendApi<{ access_token: string; refresh_token: string; expires_in: number }>(
        '/spotify/exchange-code',
        {
            method: 'POST',
            body: JSON.stringify({ code, code_verifier }),
        }
    );
};

/**
 * Calls the backend to refresh the Spotify access token using the stored refresh token.
 */
export const refreshSpotifyToken = async (): Promise<{ access_token: string; expires_in: number }> => {
    return _fetchBackendApi<{ access_token: string; expires_in: number }>(
        '/spotify/refresh-token',
        {
            method: 'POST',
        }
    );
};

/**
 * Syncs the Clerk user with the backend database.
 */
export const syncUserWithBackend = async (): Promise<void> => {
    await _fetchBackendApi<void>(
        '/users/sync',
        {
            method: 'POST',
        }
    );
};

/**
 * Saves or updates a user's selection for a specific month/year/mode.
 */
export const saveUserSelection = async (
    year: number,
    monthIndex: number, // 0-11
    mode: GridMode,
    itemType: GridItemType,
    selectedItem: SpotifyGridItem,
): Promise<any> => {
    return _fetchBackendApi<any>(
        '/user-selections',
        {
            method: 'POST',
            body: JSON.stringify({ year, monthIndex, mode, itemType, item: selectedItem }),
        }
    );
};
