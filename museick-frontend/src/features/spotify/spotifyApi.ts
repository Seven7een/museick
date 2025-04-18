import {
  SpotifySearchResults,
  SpotifyTrackItem,
  SpotifyArtistItem,
  SpotifyAlbumItem,
  SpotifyUserTopItems
} from '@/types/spotify.types';

const BASE_URL = 'https://api.spotify.com/v1';

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
    console.error(`Attempted to call Spotify API endpoint ${endpoint} without access token.`);
    // Dispatch event so UI can react (e.g., show connect button)
    window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
    throw new Error("Spotify access token is missing. Please connect Spotify.");
  }

  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${accessToken}`);
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
  limit: number = 10 // Default limit
): Promise<SpotifySearchResults> => {
  const typeString = types.join(',');
  const endpoint = `/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`;

  // Spotify search returns { tracks: { items: [...] }, artists: { items: [...] }, ... }
  const data = await _fetchSpotifyApi<any>(endpoint);

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
    limit: number = 5 // Default limit
): Promise<SpotifyTrackItem[]> => { // Return just the array of tracks
    const endpoint = `/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

    // Spotify top items returns { items: [...] }
    const data = await _fetchSpotifyApi<SpotifyUserTopItems<SpotifyTrackItem>>(endpoint);

    return data?.items ?? []; // Return the items array or empty array
};

/**
 * Fetches details for a specific Spotify item (track, artist, or album) by ID and type.
 */
export const getSpotifyItemDetails = async (
  id: string,
  type: 'track' | 'artist' | 'album'
): Promise<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem> => {
  const endpoint = `/${type}s/${id}`; // Use plural 'tracks', 'artists', 'albums'
  const data = await _fetchSpotifyApi<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem>(endpoint);
  return data;
};

// TODO: Add other direct Spotify API call functions here...
