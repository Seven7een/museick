import { fetchBackendApi } from '@/features/api/backendApi';

let getTokenFunction: (() => Promise<string | null>) | null = null;

export function initializeAuthToken(getToken: () => Promise<string | null>) {
  getTokenFunction = getToken;
}

async function getAuthToken() {
  if (!getTokenFunction) {
    console.error('Auth token getter not initialized. Call initializeAuthToken first.');
    throw new Error('Authentication not properly initialized');
  }
  const token = await getTokenFunction();
  if (!token) {
    throw new Error('Authentication token not found');
  }
  return token;
}

export const createYearlyPlaylist = async (
  year: number, 
  mode: 'muse' | 'ick', 
  includeCandidates: boolean
): Promise<any> => {
  const token = await getAuthToken();
  return fetchBackendApi(
    '/playlists',
    token,
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
