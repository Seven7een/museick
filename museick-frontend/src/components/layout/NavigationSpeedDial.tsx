import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SpeedDial, SpeedDialAction } from '@mui/material';
import { useAuth } from "@clerk/clerk-react";

import HomeIcon from '@mui/icons-material/Home';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import PersonIcon from '@mui/icons-material/Person';
import AlbumIcon from '@mui/icons-material/Album';
import MenuIcon from '@mui/icons-material/Menu';

// Define the navigation actions with an optional 'requiresAuth' flag
const actions = [
  { icon: <HomeIcon />, name: 'Home', route: '/', requiresAuth: false },
  { icon: <MusicNoteIcon />, name: 'Tracks', route: '/tracks', requiresAuth: true }, // Requires auth
  { icon: <AlbumIcon />, name: 'Albums', route: '/albums', requiresAuth: true }, // Requires auth
  { icon: <PersonIcon />, name: 'Artists', route: '/artists', requiresAuth: true }, // Requires auth
];

const NavigationSpeedDial: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const { isSignedIn } = useAuth();

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

  // Don't render the speed dial if there are no actions to show (e.g., signed out and all actions require auth)
  if (filteredActions.length === 0) {
    return null;
  }

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
        icon={<MenuIcon />}
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
