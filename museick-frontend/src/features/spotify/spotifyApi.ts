import { refreshSpotifyToken } from '@/features/api/backendApi';
import {
  SpotifySearchResults,
  SpotifyTrackItem,
  SpotifyArtistItem,
  SpotifyAlbumItem,
  SpotifyUserTopItems
} from '@/types/spotify.types';
// NOTE: We cannot use useAuth hook directly here as this is not a React component.
// Instead, the calling component will need to pass the getToken function.

const BASE_URL = 'https://api.spotify.com/v1';

// --- Helper to manage token refresh state to prevent infinite loops ---
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Attempts to refresh the Spotify token using the backend endpoint.
 * Manages concurrent refresh attempts.
 * @param getClerkToken Function to retrieve the current Clerk JWT.
 * @returns The new access token, or null if refresh fails.
 */
const attemptTokenRefresh = async (getClerkToken: () => Promise<string | null>): Promise<string | null> => {
    if (isRefreshing && refreshPromise) {
        console.log("Token refresh already in progress, waiting...");
        return refreshPromise; // Wait for the ongoing refresh
    }
    if (isRefreshing && !refreshPromise) {
        // Should not happen, but handle defensively
        console.warn("Refresh state inconsistent, blocking new refresh.");
        return null;
    }

    isRefreshing = true;
    console.log("Attempting Spotify token refresh via backend...");

    refreshPromise = (async () => {
        try {
            const jwt = await getClerkToken();
            if (!jwt) {
                throw new Error("Clerk token unavailable for Spotify refresh.");
            }
            const refreshResponse = await refreshSpotifyToken(jwt);
            const newAccessToken = refreshResponse.access_token;

            if (newAccessToken) {
                console.log("Spotify token refreshed successfully. Storing new token.");
                localStorage.setItem('spotify_access_token', newAccessToken);
                // TODO: Potentially store expires_in and calculate expiry time client-side?
                return newAccessToken;
            } else {
                throw new Error("Backend refresh response did not contain access_token.");
            }
        } catch (refreshError) {
            console.error("Spotify token refresh failed:", refreshError);
            localStorage.removeItem('spotify_access_token'); // Clear potentially invalid token
            window.dispatchEvent(new CustomEvent('spotifyAuthExpired')); // Signal auth failure
            return null; // Indicate refresh failure
        } finally {
            isRefreshing = false; // Reset refresh state
            refreshPromise = null; // Clear the promise
        }
    })();

    return refreshPromise;
};

export class SpotifyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

export async function handleSpotifyResponse(response: Response) {
  if (response.status === 401) {
    throw new SpotifyAuthError('Spotify authentication required');
  }
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Unknown error occurred');
  }
  return data;
}
/**
 * Performs a fetch request to the Spotify API, automatically including the access token
 * and handling token refresh on 401/403 errors.
 * @param endpoint The specific API endpoint (e.g., '/me/top/tracks').
 * @param getClerkToken Function to retrieve the current Clerk JWT (needed for refresh).
 * @param options Standard Fetch API options (method, headers, body).
 * @param retryAttempt Internal flag to prevent infinite refresh loops.
 * @returns Promise resolving to the parsed JSON response.
 * @throws Error if the fetch fails, token is missing/invalid after refresh, or the response is not ok.
 */
const callSpotifyApiWithRefresh = async <T = any>(
    endpoint: string,
    getClerkToken: () => Promise<string | null>, // Pass Clerk's getToken
    options: RequestInit = {},
    retryAttempt: boolean = false // Flag to prevent infinite retry loops
): Promise<T> => {
  let accessToken = localStorage.getItem('spotify_access_token'); // Use localStorage

  if (!accessToken && !retryAttempt) { // Only try initial refresh if not already retrying
    // If no token exists initially, try refreshing immediately *if* backend stores refresh tokens
    // This handles the case where the user returns after the access token expired but refresh token is valid
    console.log("No initial access token found, attempting refresh...");
    accessToken = await attemptTokenRefresh(getClerkToken);
    if (!accessToken) {
        // Still no token after refresh attempt, throw error
        console.error(`Attempted to call Spotify API endpoint ${endpoint} without access token and refresh failed.`);
        window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
        throw new Error("Spotify access token is missing and refresh failed. Please connect Spotify.");
    }
    console.log("Refresh successful, proceeding with initial call using new token.");
  } else if (!accessToken && retryAttempt) {
      // If token is missing even on retry, something went wrong with refresh
      console.error(`Access token still missing after refresh attempt for ${endpoint}.`);
      window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
      throw new Error("Spotify access token is missing after refresh attempt. Please connect Spotify.");
  }


  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`); // Use current token
  // Spotify API often uses Content-Type: application/json for POST/PUT
  if (options.body && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    let isAuthError = false;
    if (!response.ok) {
      let errorMsg = `Spotify API request failed: ${response.status} ${response.statusText}`;
      isAuthError = response.status === 401 || response.status === 403;
      try {
        const errorBody = await response.json();
        errorMsg += ` - ${errorBody.error?.message || JSON.stringify(errorBody)}`;
      } catch (e) {
        // Ignore if response body is not JSON or empty
      }
      console.error(`Error fetching ${url}: ${errorMsg}`);

      // If it's an auth error (401/403) AND we haven't already retried
      if (isAuthError && !retryAttempt) {
        console.warn("Spotify API call failed with auth error. Attempting token refresh...");
        const newAccessToken = await attemptTokenRefresh(getClerkToken);

        if (newAccessToken) {
          console.log("Token refreshed. Retrying original API call...");
          // Retry the original request with the new token, marking it as a retry
          return callSpotifyApiWithRefresh(endpoint, getClerkToken, options, true);
        } else {
          // Refresh failed, throw the original-style error
           console.error("Token refresh failed. Cannot retry API call.");
           // Ensure token is cleared if refresh fails definitively
           localStorage.removeItem('spotify_access_token');
           window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
           throw new Error("Your Spotify session is invalid and refresh failed. Please connect Spotify again.");
        }
      } else if (isAuthError && retryAttempt) {
          // Auth error even after retry, means refresh didn't work or new token is also bad
          console.error("Spotify API call failed with auth error even after refresh/retry.");
          localStorage.removeItem('spotify_access_token'); // Clear potentially invalid token
          window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
          throw new Error("Your Spotify session is invalid even after attempting refresh. Please connect Spotify again.");
      }

      // For non-auth errors, or auth errors on retry, throw the detailed error
      throw new Error(errorMsg);
    }

     // Handle cases with no content (though less common for Spotify GET requests)
     if (response.status === 204) {
        return undefined as T;
    }

    return await response.json() as T;

  } catch (error) {
    console.error(`Network or other error fetching ${url}:`, error);
    // Re-throw if it's not already the specific auth error
    if (!(error instanceof Error && error.message.includes("Spotify session is invalid"))) {
        throw error;
    } else {
        // If it IS the specific auth error, it's already been handled/thrown, so just re-throw it
        throw error;
    }
  }
};

/**
 * Searches Spotify for tracks, artists, and albums.
 */
export const searchSpotify = async (
  query: string,
  types: ('track' | 'artist' | 'album')[] = ['track', 'artist', 'album'], // Default to searching all types
  limit: number = 10, // Default limit
  getClerkToken: () => Promise<string | null> // Require getToken
): Promise<SpotifySearchResults> => {
  const typeString = types.join(',');
  const endpoint = `/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`;

  // Spotify search returns { tracks: { items: [...] }, artists: { items: [...] }, ... }
  const data = await callSpotifyApiWithRefresh<any>(endpoint, getClerkToken); // Use wrapper

  // Extract items or provide empty arrays if a type wasn't searched or returned
  const results: SpotifySearchResults = {
    tracks: data.tracks?.items ?? [],
    artists: data.artists?.items ?? [],
    albums: data.albums?.items ?? [],
  };

  return results;
};

/**
 * Fetches the current user's top tracks from Spotify.
 */
export const getMyTopTracks = async (
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term', // Default to long_term
    limit: number = 5, // Default limit
  getClerkToken: () => Promise<string | null> // Require getToken
): Promise<SpotifyTrackItem[]> => { // Return just the array of tracks
    const endpoint = `/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

    // Spotify top items returns { items: [...] }
    const data = await callSpotifyApiWithRefresh<SpotifyUserTopItems<SpotifyTrackItem>>(endpoint, getClerkToken); // Use wrapper

    return data?.items ?? []; // Return the items array or empty array
};

/**
 * Fetches details for a specific Spotify item (track, artist, or album) by ID and type.
 */
export const getSpotifyItemDetails = async (
  id: string,
  type: 'track' | 'artist' | 'album',
  getClerkToken: () => Promise<string | null> // Require getToken
): Promise<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem> => {
  const endpoint = `/${type}s/${id}`; // Use plural 'tracks', 'artists', 'albums'
  const data = await callSpotifyApiWithRefresh<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem>(endpoint, getClerkToken); // Use wrapper
  return data;
};
