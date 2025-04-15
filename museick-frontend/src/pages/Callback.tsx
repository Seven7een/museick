// src/pages/Callback.tsx

import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerifier } from '../features/spotify/auth';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const effectRan = useRef(false); // Prevent effect from running twice in StrictMode

  useEffect(() => {
    // Ensure the effect runs only once, even in React StrictMode
    if (effectRan.current === true) {
       return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const verifier = getVerifier(); // Retrieve the code verifier stored earlier

    if (code && verifier) {
      // Exchange the authorization code for an access token via the backend
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
          // Handle non-successful HTTP responses
          if (!response.ok) {
            // Try to parse error details from backend response body
            return response.json().then(errData => {
              throw new Error(`Backend token exchange failed: ${errData.error || response.statusText} (Status: ${response.status})`);
            });
          }
          // Parse successful response body as JSON
          return response.json();
        })
        .then((data) => {
          // Success: Token received from backend
          localStorage.removeItem('spotify_code_verifier'); // Clean up verifier
          console.log('Received token data from backend:', data);
          sessionStorage.setItem('spotify_access_token', data.access_token); // Store token

          // Store success status for Snackbar display on the home page
          sessionStorage.setItem('spotify_auth_status', 'success');

          // Dispatch a custom event to notify other components (like Navbar) immediately
          window.dispatchEvent(new CustomEvent('spotifyAuthSuccess'));

          // Navigate back to the home page
          navigate('/');
        })
        .catch((error) => {
          // Handle errors during the fetch/exchange process
          console.error('Error during token exchange process:', error);

          // Store error status for Snackbar display on the home page
          sessionStorage.setItem('spotify_auth_status', 'error');
          // Optionally store the specific error message if needed for the snackbar
          // sessionStorage.setItem('spotify_auth_error', error.message);

          // Navigate home even on error to show the error message
          navigate('/');
        });
    } else {
      // Handle cases where the code or verifier is missing from the callback URL
      console.error('Authorization code or verifier missing on callback.');
      sessionStorage.setItem('spotify_auth_status', 'error'); // Mark as error
      // sessionStorage.setItem('spotify_auth_error', 'Authorization code or verifier missing.');
      navigate('/'); // Navigate home to potentially show an error
    }

    // Cleanup function for the effect (runs on unmount or before re-run)
    return () => {
      effectRan.current = true; // Mark effect as having run
    };

  }, [navigate]); // Include navigate in dependency array as per React hooks linting rules

  // Display a loading message while the code exchange happens
  return <div>Loading... Exchanging authorization code...</div>;
};

export default Callback;
