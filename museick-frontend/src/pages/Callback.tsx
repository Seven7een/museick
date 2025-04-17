// src/pages/Callback.tsx
import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { getVerifier } from '../features/spotify/auth';

const Callback: React.FC = () => {
  const navigate = useNavigate();
  const effectRan = useRef(false);

  useEffect(() => {
    // Prevent running twice in StrictMode
    if (effectRan.current === true) return;
    effectRan.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error'); // Check if Spotify returned an error
    const verifier = getVerifier(); // Retrieve the stored verifier from localStorage

    // Handle direct error from Spotify
    if (error) {
      console.error('Error received from Spotify callback:', error);
      sessionStorage.setItem('spotify_auth_status', 'error');
      sessionStorage.setItem('spotify_auth_error_details', `Spotify Error: ${error}`);
      localStorage.removeItem('spotify_code_verifier'); // Clean up original verifier
      navigate('/', { replace: true }); // Redirect home to show error
      return; // Stop further processing
    }

    // Handle successful callback from Spotify
    if (code && verifier) {
      console.log('Spotify callback successful. Storing code and verifier for processing.');
      // Store code and verifier temporarily in sessionStorage for processing after redirect
      sessionStorage.setItem('spotify_pending_code', code);
      sessionStorage.setItem('spotify_pending_verifier', verifier);
      // Redirect back to home page (or another protected route), signaling processing is needed
      // Using replace: true prevents this callback URL from being in the browser history
      navigate('/?spotify_auth=pending', { replace: true });
    } else {
      // Handle missing code or verifier without an explicit error from Spotify
      console.error('Authorization code or verifier missing on callback (no error param).');
      sessionStorage.setItem('spotify_auth_status', 'error');
      sessionStorage.setItem('spotify_auth_error_details', 'Code or verifier missing during Spotify callback.');
      localStorage.removeItem('spotify_code_verifier'); // Clean up original verifier
      navigate('/', { replace: true }); // Redirect home
    }

  }, [navigate]); // Dependency array

  // Display a generic loading/redirecting message
  return <div>Processing Spotify login...</div>;
};

export default Callback;
