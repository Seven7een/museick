// src/utils/spotifyAuth.ts
import axios from 'axios';

const CLIENT_ID = 'your_spotify_client_id';
const REDIRECT_URI = 'http://localhost:3000/callback';

// Generate auth URL for Spotify
export const generateAuthUrl = () => {
  const codeVerifier = generateRandomString(128);
  const codeChallenge = generateCodeChallenge(codeVerifier);
  localStorage.setItem('code_verifier', codeVerifier);

  return `https://accounts.spotify.com/authorize?response_type=code&client_id=${CLIENT_ID}&scope=user-library-read%20user-library-modify&redirect_uri=${REDIRECT_URI}&code_challenge_method=S256&code_challenge=${codeChallenge}`;
};

// Generate a random string (for PKCE)
const generateRandomString = (length: number) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let randomString = '';
  for (let i = 0; i < length; i++) {
    randomString += charset.charAt(Math.floor(Math.random() * charset.length));
  }
  return randomString;
};

// Exchange the code for an access token
export const fetchAccessToken = async (code: string) => {
  const codeVerifier = localStorage.getItem('code_verifier');

  const response = await axios.post('https://accounts.spotify.com/api/token', new URLSearchParams({
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    code_verifier: codeVerifier || '',
  }), {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  });

  return response.data;
};

// Generate PKCE code challenge (SHA256)
const generateCodeChallenge = (codeVerifier: string) => {
  return codeVerifier
    .split('')
    .map((char) => char.charCodeAt(0))
    .map((byte) => byte.toString(16))
    .join('');
};
