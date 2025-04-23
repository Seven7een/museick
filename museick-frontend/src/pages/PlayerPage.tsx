import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Stack,
    Paper,
    CircularProgress,
    Alert,
    List,
    ListItem,
    ListItemText,
    IconButton,
    Chip,
    LinearProgress,
    Grid,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import SkipNextIcon from '@mui/icons-material/SkipNext';
import SkipPreviousIcon from '@mui/icons-material/SkipPrevious';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import ThumbDownIcon from '@mui/icons-material/ThumbDown';
import BlockIcon from '@mui/icons-material/Block';
import { getCurrentlyPlaying, getQueue, controlPlayback, updateTrackPreference } from '@/features/api/backendApi';

interface QueueItem {
    id: string;
    name: string;
    artists: string[];
    score: number;
    features: Record<string, number>;
}

const PlayerPage: React.FC = () => {
    const [currentTrack, setCurrentTrack] = useState<any>(null);
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchCurrentTrack = async () => {
        try {
            const data = await getCurrentlyPlaying();
            setCurrentTrack(data);
            setError(null);
        } catch (err) {
            setError('Failed to fetch current track');
            console.error(err);
        }
    };

    const fetchQueue = async () => {
        try {
            const data = await getQueue();
            setQueue(data.queue || []);
        } catch (err) {
            console.error('Failed to fetch queue:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePlaybackControl = async (action: 'play' | 'pause' | 'next' | 'previous') => {
        try {
            await controlPlayback(action);
            fetchCurrentTrack();
        } catch (err) {
            setError(`Failed to ${action}`);
            console.error(err);
        }
    };

    const handleTrackPreference = async (trackId: string, action: 'like' | 'dislike' | 'snooze') => {
        try {
            await updateTrackPreference(trackId, action);
            fetchQueue();
        } catch (err) {
            console.error(`Failed to ${action} track:`, err);
        }
    };

    useEffect(() => {
        fetchCurrentTrack();
        fetchQueue();
        const interval = setInterval(() => {
            fetchCurrentTrack();
            fetchQueue();
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return <Box display="flex" justifyContent="center" p={4}><CircularProgress /></Box>;
    }

    const progressPercent = currentTrack?.progress_ms 
        ? (currentTrack.progress_ms / currentTrack.item?.duration_ms) * 100 
        : 0;

    return (
        <Box p={4}>
            <Grid container spacing={3}>
                <Grid size={{xs: 12, md: 8}}>
                    <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
                        <Typography variant="h5" gutterBottom>Currently Playing</Typography>
                        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                        
                        {currentTrack?.item ? (
                            <Box>
                                <Typography variant="h6">
                                    {currentTrack.item.name}
                                </Typography>
                                <Typography variant="body1" color="text.secondary" gutterBottom>
                                    {currentTrack.item.artists?.map((a: any) => a.name).join(', ')}
                                </Typography>
                                
                                <LinearProgress 
                                    variant="determinate" 
                                    value={progressPercent}
                                    sx={{ my: 2 }}
                                />
                                
                                <Typography variant="body2" color="text.secondary" align="right">
                                    {formatTime(currentTrack.progress_ms)} / {formatTime(currentTrack.item.duration_ms)}
                                </Typography>

                                <Stack direction="row" spacing={2} sx={{ mt: 3 }}>
                                    <Button
                                        variant="contained"
                                        onClick={() => handlePlaybackControl('previous')}
                                        startIcon={<SkipPreviousIcon />}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => handlePlaybackControl(currentTrack.is_playing ? 'pause' : 'play')}
                                        startIcon={currentTrack.is_playing ? <PauseIcon /> : <PlayArrowIcon />}
                                    >
                                        {currentTrack.is_playing ? 'Pause' : 'Play'}
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => handlePlaybackControl('next')}
                                        startIcon={<SkipNextIcon />}
                                    >
                                        Next
                                    </Button>
                                </Stack>

                                <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                    <IconButton
                                        onClick={() => handleTrackPreference(currentTrack.item.id, 'like')}
                                        color="success"
                                    >
                                        <ThumbUpIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleTrackPreference(currentTrack.item.id, 'dislike')}
                                        color="error"
                                    >
                                        <ThumbDownIcon />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => handleTrackPreference(currentTrack.item.id, 'snooze')}
                                        color="warning"
                                    >
                                        <BlockIcon />
                                    </IconButton>
                                </Stack>
                            </Box>
                        ) : (
                            <Typography color="text.secondary">No track playing</Typography>
                        )}
                    </Paper>
                </Grid>

                <Grid size={{xs: 12, md: 8}}>
                    <Paper elevation={3} sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>Queue</Typography>
                        <List>
                            {queue.map((item, index) => (
                                <ListItem key={item.id} divider={index < queue.length - 1}>
                                    <ListItemText
                                        primary={item.name}
                                        secondary={
                                            <>
                                                {item.artists.join(', ')}
                                                <Box sx={{ mt: 1 }}>
                                                    <Chip 
                                                        size="small" 
                                                        label={`Score: ${(item.score * 100).toFixed(0)}%`}
                                                        color="primary"
                                                        sx={{ mr: 1 }}
                                                    />
                                                </Box>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

export default PlayerPage;
