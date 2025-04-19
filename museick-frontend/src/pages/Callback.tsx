import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { exchangeSpotifyCode } from '@/features/api/backendApi';
import { CircularProgress, Typography, Box, Alert } from '@mui/material';

const Callback: React.FC = () => {
    const { isLoaded, isSignedIn, getToken } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [processingState, setProcessingState] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');

    useEffect(() => {
        const processCallback = async () => {
            const params = new URLSearchParams(location.search);
            const code = params.get('code');
            const error = params.get('error');
            // Retrieve verifier from localStorage - DO NOT REMOVE YET
            const storedVerifier = localStorage.getItem('spotify_code_verifier');

            if (error) {
                console.error('Spotify callback error:', error);
                setProcessingState('error');
                localStorage.setItem('spotify_auth_status', 'error');
                localStorage.setItem('spotify_auth_error_details', `Spotify login failed: ${error}`);
                // Clean up verifier if Spotify itself returned an error
                if (storedVerifier) {
                    localStorage.removeItem('spotify_code_verifier');
                }
                navigate('/', { replace: true });
                return;
            }

            if (!isLoaded || !isSignedIn) {
                console.log('Callback: Waiting for Clerk to load/sign in...');
                setProcessingState('idle');
                // Wait for Clerk, DO NOT proceed or remove verifier yet
                return;
            }

            if (!code || !storedVerifier) {
                console.error('Missing code or verifier after Clerk loaded.');
                setProcessingState('error');
                localStorage.setItem('spotify_auth_status', 'error');
                localStorage.setItem('spotify_auth_error_details', 'Spotify callback missing required info after Clerk load.');
                 // Clean up verifier if it exists but code is missing
                if (storedVerifier) {
                    localStorage.removeItem('spotify_code_verifier');
                }
                navigate('/', { replace: true });
                return;
            }

            setProcessingState('processing');
            console.log('Callback: Clerk ready, attempting Spotify code exchange...');

            try {
                // REMOVE verifier just before using it or after successful use
                const verifierToUse = storedVerifier; // Keep a reference
                localStorage.removeItem('spotify_code_verifier'); // Clean up now
                console.log('Callback: Removed verifier from localStorage.');

                const tokenData = await exchangeSpotifyCode(code, verifierToUse);
                // --- DETAILED LOGGING ---
                console.log('Callback: Received tokenData from backend:', JSON.stringify(tokenData)); // Log the whole object

                if (tokenData && tokenData.access_token) {
                    // --- Add specific try/catch for storage ---
                    try {
                        console.log('Callback: Attempting to set spotify_access_token in localStorage...');
                        localStorage.setItem('spotify_access_token', tokenData.access_token);
                        console.log('Callback: spotify_access_token potentially set in localStorage.'); // Check browser console AND storage

                        console.log('Callback: Attempting to set spotify_auth_status in localStorage...');
                        localStorage.setItem('spotify_auth_status', 'success');
                        console.log('Callback: spotify_auth_status potentially set in localStorage.');
                    } catch (storageError) {
                        console.error("Callback: CRITICAL ERROR setting localStorage:", storageError);
                        // Throw a new error to be caught by the outer catch block, making it visible
                        throw new Error(`Failed to write to localStorage: ${storageError instanceof Error ? storageError.message : String(storageError)}`); // Update error message
                    }
                    // --- End specific try/catch ---

                    console.log('Callback: Dispatching spotifyAuthSuccess event...');
                    window.dispatchEvent(new CustomEvent('spotifyAuthSuccess'));
                    console.log('Callback: Event dispatched.');

                    setProcessingState('success');
                    console.log('Callback: Navigating back to / ...');
                    navigate('/', { replace: true });

                } else {
                     // Handle case where backend response is OK but missing token
                     console.error('Callback: Backend response OK but tokenData or access_token is missing.', tokenData);
                     throw new Error('Received invalid token data structure from backend.');
                }
                // --- END DETAILED LOGGING ---

            } catch (err: any) {
                console.error("Error during Spotify token exchange in Callback:", err);
                setProcessingState('error');
                localStorage.setItem('spotify_auth_status', 'error');
                localStorage.setItem('spotify_auth_error_details', err.message || 'Failed to exchange Spotify code with backend.');

                // Ensure verifier is cleaned up even on error during exchange
                if (localStorage.getItem('spotify_code_verifier')) {
                     localStorage.removeItem('spotify_code_verifier');
                     console.log('Callback: Removed verifier from localStorage after exchange error.');
                }

                 navigate('/', { replace: true });
            }
        };

        processCallback();

    }, [isLoaded, isSignedIn, getToken, location.search, navigate]);

    return (
        <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" minHeight="50vh">
            {processingState === 'processing' && (
                <>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Processing Spotify login...</Typography>
                </>
            )}
             {processingState === 'idle' && !isLoaded && (
                <>
                    <CircularProgress />
                    <Typography sx={{ mt: 2 }}>Loading authentication...</Typography>
                </>
            )}
             {processingState === 'idle' && isLoaded && !isSignedIn && (
                 // This state might occur if the user somehow lands here without being logged into Clerk
                 <Alert severity="warning">Please sign in to complete the Spotify connection.</Alert>
             )}
            {/* Error message is handled by redirecting and showing on HomePage */}
            {/* Success message is handled by redirecting and showing on HomePage */}
        </Box>
    );
};

export default Callback;
