import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Slider,
    Button,
    Paper,
    Stack,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Checkbox,
    FormGroup,
    FormControlLabel,
    Switch,
    CircularProgress,
    Alert,
    Chip,
} from '@mui/material';

interface AudioFeatureControl {
    name: string;
    label: string;
    value: number;
    weight: number;
}

interface Playlist {
    id: string;
    name: string;
    tracks: number;
}

const ShufflePage: React.FC = () => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [selectedPlaylists, setSelectedPlaylists] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedGenres, setSelectedGenres] = useState<Set<string>>(new Set());
    const [availableGenres, setAvailableGenres] = useState<string[]>([]);
    
    const [featureControls, setFeatureControls] = useState<AudioFeatureControl[]>([
        { name: 'danceability', label: 'Danceability', value: 0.5, weight: 1.0 },
        { name: 'energy', label: 'Energy', value: 0.5, weight: 1.0 },
        { name: 'valence', label: 'Positiveness', value: 0.5, weight: 1.0 },
        { name: 'tempo', label: 'Tempo', value: 0.5, weight: 0.7 },
        { name: 'instrumentalness', label: 'Instrumentalness', value: 0.5, weight: 0.5 },
        { name: 'acousticness', label: 'Acousticness', value: 0.5, weight: 0.5 },
        { name: 'liveness', label: 'Liveness', value: 0.5, weight: 0.3 },
        { name: 'speechiness', label: 'Speechiness', value: 0.5, weight: 0.3 },
    ]);

    useEffect(() => {
        fetchPlaylists();
    }, []);

    const fetchPlaylists = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/shufl/playlists', {
                headers: {
                    'X-Spotify-Token': localStorage.getItem('spotify_access_token') || '',
                },
            });
            if (!response.ok) throw new Error('Failed to fetch playlists');
            const data = await response.json();
            setPlaylists(data.playlists);
            
            // Extract unique genres from all playlists
            const genres = new Set<string>();
            data.playlists.forEach((playlist: any) => {
                playlist.genres?.forEach((genre: string) => genres.add(genre));
            });
            setAvailableGenres(Array.from(genres).sort());
            
        } catch (error) {
            setError('Failed to load playlists');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const togglePlaylist = (playlistId: string) => {
        setSelectedPlaylists(prev => {
            const next = new Set(prev);
            if (next.has(playlistId)) {
                next.delete(playlistId);
            } else {
                next.add(playlistId);
            }
            return next;
        });
    };

    const toggleGenre = (genre: string) => {
        setSelectedGenres(prev => {
            const next = new Set(prev);
            if (next.has(genre)) {
                next.delete(genre);
            } else {
                next.add(genre);
            }
            return next;
        });
    };

    const handleStartSession = async () => {
        if (selectedPlaylists.size === 0) {
            setError('Please select at least one playlist');
            return;
        }

        const prefs = {
            playlists: Array.from(selectedPlaylists),
            genres: Array.from(selectedGenres),
            audioFeatures: Object.fromEntries(
                featureControls.map(fc => [
                    fc.name,
                    { target: fc.value, weight: fc.weight }
                ])
            ),
            memoryBiasWeight: 0.4, // Default value for recency bias
        };

        try {
            setLoading(true);
            const response = await fetch('/api/shufl/queue/start', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Spotify-Token': localStorage.getItem('spotify_access_token') || '',
                },
                body: JSON.stringify(prefs),
            });

            if (!response.ok) throw new Error('Failed to start session');
            
            // Redirect to player page
            window.location.href = '/player';
        } catch (error) {
            setError('Failed to start shuffle session');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Shuffle Preferences
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Select Playlists
                </Typography>
                <List>
                    {playlists.map((playlist) => (
                        <ListItem key={playlist.id}>
                            <ListItemText 
                                primary={playlist.name}
                                secondary={`${playlist.tracks} tracks`}
                            />
                            <ListItemSecondaryAction>
                                <Checkbox
                                    edge="end"
                                    onChange={() => togglePlaylist(playlist.id)}
                                    checked={selectedPlaylists.has(playlist.id)}
                                />
                            </ListItemSecondaryAction>
                        </ListItem>
                    ))}
                </List>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Select Genres
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {availableGenres.map((genre) => (
                        <Chip
                            key={genre}
                            label={genre}
                            onClick={() => toggleGenre(genre)}
                            color={selectedGenres.has(genre) ? "primary" : "default"}
                        />
                    ))}
                </Box>
            </Paper>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                    Audio Features
                </Typography>
                <Stack spacing={3}>
                    {featureControls.map((control) => (
                        <Box key={control.name}>
                            <Typography gutterBottom>
                                {control.label} (Weight: {control.weight})
                            </Typography>
                            <Slider
                                value={control.value}
                                onChange={(_, value) => {
                                    setFeatureControls(controls =>
                                        controls.map(c =>
                                            c.name === control.name
                                                ? { ...c, value: value as number }
                                                : c
                                        )
                                    );
                                }}
                                min={0}
                                max={1}
                                step={0.1}
                                marks
                                valueLabelDisplay="auto"
                            />
                            <Slider
                                value={control.weight}
                                onChange={(_, value) => {
                                    setFeatureControls(controls =>
                                        controls.map(c =>
                                            c.name === control.name
                                                ? { ...c, weight: value as number }
                                                : c
                                        )
                                    );
                                }}
                                min={0}
                                max={1}
                                step={0.1}
                                marks
                                valueLabelDisplay="auto"
                                sx={{ mt: 1 }}
                                color="secondary"
                            />
                        </Box>
                    ))}
                </Stack>
            </Paper>

            <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={handleStartSession}
                disabled={loading || selectedPlaylists.size === 0}
            >
                Start Shuffle Session
            </Button>
        </Box>
    );
};

export default ShufflePage;
