import { fetchBackendApi } from '@/features/api/backendApi';

export const createYearlyPlaylist = async (
  year: number, 
  mode: 'muse' | 'ick', 
  includeCandidates: boolean
): Promise<any> => {
  return fetchBackendApi(
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
