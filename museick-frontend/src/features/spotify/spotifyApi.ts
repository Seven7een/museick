// src/features/spotify/spotifyApi.ts

// Define interfaces for the items we expect in the search results
// (Simplified based on the structure needed for display)
export interface SpotifyTrackItem {
  id: string;
  name: string;
  artists: { name: string }[];
  album: {
    images: { url: string }[];
  };
  external_urls: {
    spotify: string;
  };
}

export interface SpotifyArtistItem {
  id: string;
  name: string;
  images: { url: string }[];
  external_urls: {
    spotify: string;
  };
  genres: string[];
}

export interface SpotifyAlbumItem {
  id: string;
  name: string;
  artists: { name: string }[];
  images: { url: string }[];
  external_urls: {
    spotify: string;
  };
  release_date: string;
}

// Define the structure of the object returned by our search function
export interface SpotifySearchResults {
  tracks: SpotifyTrackItem[];
  artists: SpotifyArtistItem[];
  albums: SpotifyAlbumItem[];
}

/**
 * Searches Spotify for tracks, artists, and albums.
 * @param query The search term entered by the user.
 * @returns A promise resolving to an object containing arrays of tracks, artists, and albums.
 */
export const searchSpotify = async (query: string): Promise<SpotifySearchResults> => {
  const accessToken = sessionStorage.getItem('spotify_access_token');

  if (!accessToken) {
    throw new Error('Spotify access token not found. Please log in.');
  }

  // Encode the search query for the URL
  const encodedQuery = encodeURIComponent(query);
  // Define the types we want to search for
  const types = 'track,artist,album';
  // Construct the API endpoint URL
  const endpoint = `v1/search?q=${encodedQuery}&type=${types}&limit=10`; // Limit results per type

  try {
    const res = await fetch(`https://api.spotify.com/${endpoint}`, {
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
        errorMsg = errorBody?.error?.message || errorMsg;
      } catch (e) {
        // Ignore if error body parsing fails
      }
       // Specific handling for expired token
      if (res.status === 401) {
        sessionStorage.removeItem('spotify_access_token'); // Clear expired token
        errorMsg = "Your Spotify session expired. Please log in again.";
      }
      throw new Error(errorMsg);
    }

    const data = await res.json();

    // Extract the items arrays, providing empty arrays as fallbacks
    const results: SpotifySearchResults = {
      tracks: data?.tracks?.items ?? [],
      artists: data?.artists?.items ?? [],
      albums: data?.albums?.items ?? [],
    };

    return results;

  } catch (err: any) {
    console.error("Error during Spotify search:", err);
    // Re-throw the error to be caught by the component
    throw err;
  }
};

