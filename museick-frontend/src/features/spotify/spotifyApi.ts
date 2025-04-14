// src/features/spotify/spotifyApi.ts
export const searchSpotify = async (query: string) => {
    const token = localStorage.getItem('spotify_access_token');
    if (!token) {
      throw new Error('Spotify token not found');
    }
  
    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
  
    if (!res.ok) {
      throw new Error(`Spotify API error: ${res.status}`);
    }
  
    const data = await res.json();
    return data.tracks.items; // Array of track objects
  };
  