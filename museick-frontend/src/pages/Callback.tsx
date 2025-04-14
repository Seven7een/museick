// src/pages/Callback.tsx
import React, { useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { exchangeCodeForToken } from '@/features/spotify/auth';

const Callback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchToken = async () => {
      const code = searchParams.get('code');
      if (code) {
        try {
          const tokenData = await exchangeCodeForToken(code);
          localStorage.setItem('spotify_access_token', tokenData.access_token);
          // Optional: store refresh token too
          navigate('/');
        } catch (err) {
          console.error('Error exchanging token:', err);
          navigate('/');
        }
      }
    };

    fetchToken();
  }, [searchParams, navigate]);

  return <p>Loading...</p>;
};

export default Callback;
