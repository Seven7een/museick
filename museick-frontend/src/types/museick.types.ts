import { GridItemType } from './spotify.types'; // Corrected import

// Matches backend models.SelectionRole
export type SelectionRole =
  | 'muse_candidate'
  | 'ick_candidate'
  | 'muse_selected'
  | 'ick_selected';

// Matches backend models.UserSelection
export interface UserSelection {
  id: string; // MongoDB ObjectID as string
  user_id: string;
  spotify_id: string;
  spotify_type: GridItemType; // Corrected type usage
  selection_role: SelectionRole;
  month_year: string; // "YYYY-MM"
  added_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  notes?: string;
  // We might need to embed some core Spotify item details here for display
  // or fetch them separately based on spotify_id/spotify_type.
  // For simplicity now, assume we fetch separately or the grid/modal already has item details.
  // Example embedded details (optional):
  // name?: string;
  // artists_display?: string;
  // image_url?: string;
}

// Augment SpotifyGridItem to include selection details when relevant
/* declare module '@/types/spotify.types' {
  interface SpotifyGridItem {
    selectionId?: string; // The MongoDB _id of the UserSelection record
    selectionRole?: SelectionRole;
  }
}*/
