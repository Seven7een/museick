// src/pages/Callback.tsx

import React, { useEffect, useRef } from 'react'; // Import useRef
import { useNavigate } from 'react-router-dom';
import { getVerifier } from '../features/spotify/auth';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  // Ref to track if the effect has already run its course
  const effectRan = useRef(false); // Initialize with false

  useEffect(() => {
    // --- Strict Mode Guard ---
    // In development, this effect runs twice. Only proceed on the second run
    // or if not in development (where effectRan.current will stay false).
    // Alternatively, only run if the ref is false, then set it to true.
    if (effectRan.current === true) {
       return; // Exit early if this is the second run in Strict Mode
    }
    // --- End Strict Mode Guard ---


    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = getVerifier();

    if (code && verifier) {
      // Mark that the fetch is being initiated
      // effectRan.current = true; // Set the flag *before* the async operation

      fetch('http://localhost:8080/api/spotify/exchange-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: code,
          code_verifier: verifier
        }),
      })
        .then((response) => {
          if (!response.ok) {
            return response.json().then(errData => {
              // Construct a more informative error
              throw new Error(`Backend token exchange failed: ${errData.error || response.statusText} (Status: ${response.status})`);
            });
          }
          return response.json();
        })
        .then((data) => {
          localStorage.removeItem('spotify_code_verifier');
          console.log('Received token data from backend:', data);
          sessionStorage.setItem('spotify_access_token', data.access_token);
          // TODO: Securely handle refresh token
          navigate('/');
        })
        .catch((error) => {
          // Don't remove verifier here if the fetch itself failed initially
          // It might be needed if the user retries manually
          console.error('Error during token exchange process:', error);
          // navigate('/login-error');
        });
    } else {
      console.error('Authorization code or verifier missing on callback.');
      // navigate('/login-error');
    }

    // Cleanup function for Strict Mode: Reset the ref on unmount
    return () => {
      effectRan.current = true; // Mark that the effect has run once
    };

  }, []); // Empty dependency array is correct

  return <div>Loading... Exchanging authorization code...</div>;
};

export default Callback;
