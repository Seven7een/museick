// src/features/spotify/spotifyApi.ts

// Import the types from the dedicated types file
import {
  SpotifySearchResults,
  SpotifyTrackItem, // Keep if needed for internal casting/checks, otherwise remove if only SpotifySearchResults is used directly
  SpotifyArtistItem, // Keep if needed for internal casting/checks
  SpotifyAlbumItem // Keep if needed for internal casting/checks
} from '@/types/spotify.types'; // Adjust path if your structure differs

/**
 * Searches Spotify for tracks, artists, and albums.
 * @param query The search term entered by the user.
 * @returns A promise resolving to an object containing arrays of tracks, artists, and albums.
 */
export const searchSpotify = async (query: string): Promise<SpotifySearchResults> => {
  const accessToken = sessionStorage.getItem('spotify_access_token');

  if (!accessToken) {
    // Consider redirecting to login or showing a specific message
    throw new Error('Spotify access token not found. Please connect Spotify.');
  }

  // Encode the search query for the URL
  const encodedQuery = encodeURIComponent(query);
  // Define the types we want to search for
  const types = 'track,artist,album';
  // Construct the API endpoint URL using Spotify's base API URL
  const baseUrl = 'https://api.spotify.com/v1';
  const endpoint = `${baseUrl}/search?q=${encodedQuery}&type=${types}&limit=10`; // Limit results per type

  try {
    const res = await fetch(endpoint, { // Use the full endpoint URL
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!res.ok) {
      // Handle non-successful responses (e.g., 401 Unauthorized, 403 Forbidden)
      let errorMsg = `Spotify API Error: ${res.status} ${res.statusText}`;
      try {
        const errorBody = await res.json();
        // Spotify often returns error details in { error: { message: '...', status: ... } }
        errorMsg = errorBody?.error?.message || errorMsg;
      } catch (e) {
        // Ignore if error body parsing fails, stick with status text
      }
       // Specific handling for expired/invalid token
      if (res.status === 401) {
        console.warn("Spotify token expired or invalid. Clearing token.");
        sessionStorage.removeItem('spotify_access_token'); // Clear expired token
        // Optionally trigger a state update or event to show 'Connect Spotify' button again
        // window.dispatchEvent(new CustomEvent('spotifyAuthExpired'));
        errorMsg = "Your Spotify session expired or is invalid. Please connect Spotify again.";
        // Depending on UX, you might want to force a reload or redirect here
        // window.location.reload();
      }
      throw new Error(errorMsg);
    }

    // Parse the JSON response
    const data = await res.json();

    // Extract the items arrays, providing empty arrays as fallbacks
    // The structure from Spotify is { tracks: { items: [...] }, artists: { items: [...] }, ... }
    const results: SpotifySearchResults = {
      tracks: data?.tracks?.items ?? [],
      artists: data?.artists?.items ?? [],
      albums: data?.albums?.items ?? [],
    };

    return results;

  } catch (err: any) {
    console.error("Error during Spotify search:", err.message);
    // Re-throw the error so UI components can handle it (e.g., show error message)
    throw err;
  }
};

// Add other Spotify API functions here (e.g., getTopTracks, getTrackDetails, etc.)
// Example:
/*
export const getMyTopTracks = async (timeRange: 'short_term' | 'medium_term' | 'long_term' = 'medium_term', limit: number = 20): Promise<SpotifyUserTopItems<SpotifyTrackItem>> => {
  const accessToken = sessionStorage.getItem('spotify_access_token');
  if (!accessToken) throw new Error('Spotify access token not found.');

  const baseUrl = 'https://api.spotify.com/v1';
  const endpoint = `${baseUrl}/me/top/tracks?time_range=${timeRange}&limit=${limit}`;

  try {
    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
       // Add similar error handling as searchSpotify
       throw new Error(`Spotify API Error: ${res.status}`);
    }
    const data = await res.json();
    return data as SpotifyUserTopItems<SpotifyTrackItem>; // Cast the result
  } catch (err: any) {
    console.error("Error fetching top tracks:", err.message);
    throw err;
  }
};
*/

