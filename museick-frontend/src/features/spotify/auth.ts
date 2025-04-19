// Utility for generating PKCE code verifier and challenge
export function generateCodeVerifier(length = 128): string {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let verifier = '';
  for (let i = 0; i < length; i++) {
    verifier += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return verifier;
}

export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await window.crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Helpers to manage auth state
export const saveVerifier = (verifier: string) => {
  localStorage.setItem('spotify_code_verifier', verifier);
};

export const getVerifier = (): string | null => {
  return localStorage.getItem('spotify_code_verifier');
};

export const buildSpotifyAuthUrl = async (): Promise<string> => {
  const verifier = generateCodeVerifier();
  const challenge = await generateCodeChallenge(verifier);
  console.log("Generated verifier:", verifier); // DEBUG LOG
  saveVerifier(verifier);
  console.log("Verifier saved to localStorage"); // DEBUG LOG

  // --- Add the required scope here ---
  const requestedScopes = 'user-read-private user-read-email user-top-read playlist-modify-public playlist-modify-private ugc-image-upload';

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    code_challenge_method: 'S256',
    code_challenge: challenge,
    scope: requestedScopes,
  });

  return `https://accounts.spotify.com/authorize?${params.toString()}`;
};

export const exchangeCodeForToken = async (code: string): Promise<any> => {
  const verifier = getVerifier();
  if (!verifier) throw new Error('No code verifier found in localStorage');

  const params = new URLSearchParams({
    client_id: import.meta.env.VITE_SPOTIFY_CLIENT_ID,
    grant_type: 'authorization_code',
    code,
    redirect_uri: import.meta.env.VITE_SPOTIFY_REDIRECT_URI,
    code_verifier: verifier,
  });

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });

  if (!res.ok) throw new Error('Token exchange failed');

  return res.json();
};
