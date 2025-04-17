// Define interfaces for items returned by the Spotify API,
// particularly for search results and potentially other endpoints.

export interface SpotifyImage {
    url: string;
    height?: number; // Optional, but often included
    width?: number;  // Optional, but often included
  }

  export interface SpotifyExternalUrls {
    spotify: string;
  }

  export interface SpotifyArtistSimplified {
    name: string;
    id?: string; // Sometimes included
    external_urls?: SpotifyExternalUrls; // Sometimes included
  }

  export interface SpotifyAlbumSimplified {
    id: string;
    name: string;
    images: SpotifyImage[];
    artists?: SpotifyArtistSimplified[]; // Sometimes included
    external_urls?: SpotifyExternalUrls; // Sometimes included
    release_date?: string; // Sometimes included
  }

  // Interface for a full Track object (can be expanded based on needs)
  export interface SpotifyTrackItem {
    id: string;
    name: string;
    artists: SpotifyArtistSimplified[];
    album: SpotifyAlbumSimplified;
    external_urls: SpotifyExternalUrls;
    preview_url?: string | null; // Important for playback snippets
    duration_ms?: number;
    popularity?: number;
    // TODO: Add other fields as needed (e.g., is_playable, available_markets)
  }

  // Interface for a full Artist object
  export interface SpotifyArtistItem {
    id: string;
    name: string;
    images: SpotifyImage[];
    external_urls: SpotifyExternalUrls;
    genres: string[];
    popularity?: number;
    followers?: { total: number };
    // TODO: Add other fields as needed (e.g., type, uri)
  }

  // Interface for a full Album object
  export interface SpotifyAlbumItem {
    id: string;
    name: string;
    artists: SpotifyArtistSimplified[];
    images: SpotifyImage[];
    external_urls: SpotifyExternalUrls;
    release_date: string;
    total_tracks?: number;
    popularity?: number;
    genres?: string[]; // Albums might have genres too
    // TODO: Add other fields as needed (e.g., album_type, label, copyrights)
  }

  // Define the structure of the object returned by the search function
  export interface SpotifySearchResults {
    tracks: SpotifyTrackItem[];
    artists: SpotifyArtistItem[];
    albums: SpotifyAlbumItem[];
  }

  // You might also want a type for the User's Top Items
  export interface SpotifyUserTopItems<T extends SpotifyTrackItem | SpotifyArtistItem> {
      items: T[];
      total: number;
      limit: number;
      offset: number;
      href: string;
      next: string | null;
      previous: string | null;
  }

export type SpotifyGridItem = SpotifyTrackItem | SpotifyArtistItem | SpotifyAlbumItem;

export type GridMode = 'favorite' | 'leastFavorite'; // Or 'muse' | 'ick'

export type GridItemType = 'track' | 'artist' | 'album';
