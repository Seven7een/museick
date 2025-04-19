import { attemptTokenRefresh } from '@/features/api/backendApi';
import {
  SpotifySearchResults,
  SpotifyTrackItem,
  SpotifyArtistItem,
  SpotifyAlbumItem,
  SpotifyUserTopItems,
  SpotifyImage
} from '@/types/spotify.types';

const BASE_URL = 'https://api.spotify.com/v1';

// Define custom error for Spotify authentication issues
export class SpotifyAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpotifyAuthError';
  }
}

// Helper to handle common Spotify response patterns and errors
export async function handleSpotifyResponse(response: Response) {
  if (response.status === 401) {
    // Throw specific error for auth issues, triggering refresh logic
    throw new SpotifyAuthError('Spotify authentication required');
  }
  // For non-JSON responses or empty bodies (like 204 No Content)
  if (response.status === 204) {
    return null; // Or undefined, depending on expected handling
  }
  if (!response.ok) {
    let errorMsg = `Spotify API Error: ${response.status} ${response.statusText}`;
    try {
      const errorBody = await response.json();
      errorMsg += ` - ${errorBody.error?.message || JSON.stringify(errorBody)}`;
    } catch (e) { /* Ignore if body isn't JSON */ }
    throw new Error(errorMsg);
  }
  // Only parse JSON if there's content
  if (response.headers.get('content-length') === '0') {
      return null;
  }
  try {
      return await response.json();
  } catch (e) {
      console.error("Failed to parse Spotify JSON response", e);
      throw new Error("Failed to parse Spotify response");
  }
}

/**
 * Internal function to handle Spotify API requests with token management
 */
const _fetchFromSpotifyApi = async <T = any>(
    endpoint: string,
    options: RequestInit = {},
    retryAttempt: boolean = false
): Promise<T> => {
    let accessToken = localStorage.getItem('spotify_access_token');

    if (!accessToken && !retryAttempt) {
        console.log("No initial access token found, attempting refresh...");
        accessToken = await attemptTokenRefresh();
        if (!accessToken) {
            console.error(`Attempted to call Spotify API endpoint ${endpoint} without access token and refresh failed.`);
            window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
            throw new SpotifyAuthError("Spotify access token is missing and refresh failed. Please connect Spotify.");
        }
    } else if (!accessToken && retryAttempt) {
        console.error(`Access token still missing after refresh attempt for ${endpoint}.`);
        window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
        throw new SpotifyAuthError("Spotify access token is missing after refresh attempt. Please connect Spotify.");
    }

    const url = `${BASE_URL}${endpoint}`;
    const headers = new Headers(options.headers || {});
    headers.set('Authorization', `Bearer ${accessToken}`);
    
    if (options.body && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
        });

        // Use the handleSpotifyResponse helper, but catch SpotifyAuthError specifically for refresh
        return await handleSpotifyResponse(response);

    } catch (error) {
        // If it's an auth error AND we haven't already retried, attempt refresh
        if (error instanceof SpotifyAuthError && !retryAttempt) {
            console.warn("Spotify API call failed with auth error. Attempting token refresh...");
            const newAccessToken = await attemptTokenRefresh();

            if (newAccessToken) {
                console.log("Token refreshed. Retrying original API call...");
                return _fetchFromSpotifyApi(endpoint, options, true); // Retry the call
            } else {
                console.error("Token refresh failed. Cannot retry API call.");
                localStorage.removeItem('spotify_access_token');
                window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
                throw new SpotifyAuthError("Your Spotify session is invalid and refresh failed. Please connect Spotify again.");
            }
        } else if (error instanceof SpotifyAuthError && retryAttempt) {
             console.error("Spotify API call failed with auth error even after refresh/retry.");
             localStorage.removeItem('spotify_access_token');
             window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
             throw new SpotifyAuthError("Your Spotify session is invalid even after attempting refresh. Please connect Spotify again.");
        }
        
        // Re-throw other errors (network errors, non-auth API errors)
        console.error(`Network or other error fetching ${url}:`, error);
        throw error;
    }
};

/**
 * Searches Spotify for tracks, artists, and albums.
 */
export const searchSpotify = async (
    query: string,
    types: ('track' | 'artist' | 'album')[] = ['track', 'artist', 'album'],
    limit: number = 10
): Promise<SpotifySearchResults> => {
    const typeString = types.join(',');
    const endpoint = `/search?q=${encodeURIComponent(query)}&type=${typeString}&limit=${limit}`;
    const data = await _fetchFromSpotifyApi<any>(endpoint);

    return {
        tracks: data.tracks?.items ?? [],
        artists: data.artists?.items ?? [],
        albums: data.albums?.items ?? [],
    };
};

/**
 * Fetches the current user's top tracks from Spotify.
 */
export const getMyTopTracks = async (
    timeRange: 'short_term' | 'medium_term' | 'long_term' = 'long_term',
    limit: number = 5
): Promise<SpotifyTrackItem[]> => {
    const endpoint = `/me/top/tracks?time_range=${timeRange}&limit=${limit}`;
    const data = await _fetchFromSpotifyApi<SpotifyUserTopItems<SpotifyTrackItem>>(endpoint);
    return data?.items ?? [];
};

/**
 * Fetches details for a specific Spotify item (track, artist, or album) by ID and type.
 */
export const getSpotifyItemDetails = async (
    id: string,
    type: 'track' | 'artist' | 'album'
): Promise<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem> => {
    const endpoint = `/${type}s/${id}`;
    return await _fetchFromSpotifyApi<SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem>(endpoint);
};

/**
 * Get the images for a playlist
 */
export const getPlaylistImages = async (playlistId: string): Promise<SpotifyImage[]> => {
    const endpoint = `/playlists/${playlistId}/images`;
    return await _fetchFromSpotifyApi<SpotifyImage[]>(endpoint);
};
