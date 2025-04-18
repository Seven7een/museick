import { GridItemType } from './spotify.types';

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
  spotify_item_id: string;
  item_type: GridItemType;
  selection_role: SelectionRole;
  month_year: string; // "YYYY-MM"
  added_at: string; // ISO Date string
  updated_at: string; // ISO Date string
  notes?: string;
  // This is used for comms with the backend API and spotify, but the actual display on frontend is done with the interface
  // type DisplayListItem = (SpotifyTrackItem | SpotifyAlbumItem | SpotifyArtistItem) & {
  //   type: GridItemType;
  //   selectionId?: string;
  //   selectionRole?: SelectionRole;
}