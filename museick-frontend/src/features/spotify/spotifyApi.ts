// src/features/spotify/spotifyApi.ts
import {
  SpotifySearchResults,
  SpotifyTrackItem,
  SpotifyArtistItem,
  SpotifyAlbumItem,
  SpotifyUserTopItems, // Import if needed for getMyTopTracks
} from '@/types/spotify.types';

const BASE_URL = 'https://api.spotify.com/v1';

// --- Private Helper Function ---
/**
 * Performs a fetch request to the Spotify API, automatically including the access token.
 * @param endpoint The specific API endpoint (e.g., '/me/top/tracks').
 * @param options Standard Fetch API options (method, headers, body).
 * @returns Promise resolving to the parsed JSON response.
 * @throws Error if the fetch fails, token is missing, or the response is not ok.
 */
const _fetchSpotifyApi = async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
  const accessToken = sessionStorage.getItem('spotify_access_token');

  if (!accessToken) {
    // This indicates the user needs to connect/reconnect Spotify
    throw new Error('Spotify access token not found in session storage.');
  }

  const url = endpoint.startsWith('https://') ? endpoint : `${BASE_URL}${endpoint}`; // Handle full URLs if needed

  const defaultHeaders: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };

  const config: RequestInit = {
    method: 'GET', // Default to GET
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);

    if (!response.ok) {
      let errorMsg = `Spotify API Error: ${response.status} ${response.statusText}`;
      let isAuthError = response.status === 401 || response.status === 403;
      try {
        const errorBody = await response.json();
        errorMsg = errorBody?.error?.message || errorMsg;
      } catch (e) { /* Ignore */ }

      console.error(`Spotify fetch failed for ${url}: ${errorMsg}`);

      // If it's an auth error, clear the potentially invalid token
      if (isAuthError) {
        console.warn("Spotify token potentially expired or invalid. Clearing token.");
        sessionStorage.removeItem('spotify_access_token');
        // Dispatch event so UI can react (e.g., show connect button)
        window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
        // Throw a more specific error for UI handling
        throw new Error("Your Spotify session is invalid. Please connect Spotify again.");
      }

      throw new Error(errorMsg); // Throw general error for other issues
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
    }
    // If it IS the specific auth error, let it propagate
    throw error;
  }
};


// --- Public API Functions ---

/**
 * Searches Spotify for tracks, artists, and albums.
 */
export const searchSpotify = async (query: string, limit: number = 10): Promise<SpotifySearchResults> => {
  const encodedQuery = encodeURIComponent(query);
  const types = 'track,artist,album';
  const endpoint = `/search?q=${encodedQuery}&type=${types}&limit=${limit}`;

  // Spotify search returns { tracks: { items: [...] }, artists: { items: [...] }, ... }
  const data = await _fetchSpotifyApi<{
    tracks: { items: SpotifyTrackItem[] };
    artists: { items: SpotifyArtistItem[] };
    albums: { items: SpotifyAlbumItem[] };
  }>(endpoint);

  // Extract the items arrays, providing empty arrays as fallbacks
  return {
    tracks: data?.tracks?.items ?? [],
    artists: data?.artists?.items ?? [],
    albums: data?.albums?.items ?? [],
  };
};

/**
 * Fetches the current user's top tracks from Spotify.
 */
export const getMyTopTracks = async (
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term', // Default to long_term
    limit: number = 5 // Default limit
): Promise<SpotifyTrackItem[]> => { // Return just the array of tracks
    const endpoint = `/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

    // Spotify top items returns { items: [...] }
    const data = await _fetchSpotifyApi<SpotifyUserTopItems<SpotifyTrackItem>>(endpoint);

    return data?.items ?? []; // Return the items array or empty array
};

// Add other direct Spotify API call functions here...
