// src/components/layout/NavigationSpeedDial.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';
import { useAuth } from "@clerk/clerk-react"; // Import useAuth

// Import icons
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';

// Define the navigation actions with an optional 'requiresAuth' flag
const actions = [
  { icon: <HomeIcon />, name: 'Home', route: '/', requiresAuth: false },
  { icon: <MusicNoteIcon />, name: 'Tracks', route: '/tracks', requiresAuth: true }, // Requires auth
  { icon: <AlbumIcon />, name: 'Albums', route: '/albums', requiresAuth: true }, // Requires auth
  { icon: <PersonIcon />, name: 'Artists', route: '/artists', requiresAuth: true }, // Requires auth
  { icon: <BuildIcon />, name: 'Playground', route: '/playground', requiresAuth: false }, // Assuming playground is public/dev only
];

const NavigationSpeedDial: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth(); // Get Clerk auth state

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const handleActionClick = (route: string) => {
    navigate(route);
    handleClose();
  };

  // Filter actions based on authentication status
  const filteredActions = actions.filter(action =>
    !action.requiresAuth || isSignedIn // Show if auth not required OR if user is signed in
  );

  return (
    <Box
      sx={{
        position: 'fixed', bottom: 16, right: 16, zIndex: (theme) => theme.zIndex.drawer + 1,
        transform: 'translateZ(0px)', flexGrow: 1,
      }}
    >
      <SpeedDial
        ariaLabel="Navigation speed dial"
        sx={{ position: 'absolute', bottom: 0, right: 0 }}
        icon={<SpeedDialIcon />}
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
        direction="up"
      >
        {/* Map over the FILTERED actions */}
        {filteredActions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen
            onClick={() => handleActionClick(action.route)}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};

export default NavigationSpeedDial;
