import { fetchBackendApi } from '@/features/api/backendApi';

interface CreatePlaylistResponse {
  message: string;
  url: string;
}

export const createYearlyPlaylist = async (
  year: number, 
  mode: 'muse' | 'ick', 
  includeCandidates: boolean
): Promise<CreatePlaylistResponse> => {
  return fetchBackendApi<CreatePlaylistResponse>(
    '/playlists',
    {
      method: 'POST',
      body: JSON.stringify({
        year,
        mode,
        include_candidates: includeCandidates,
      }),
    }
  );
};
