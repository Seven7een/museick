// src/components/layout/NavigationSpeedDial.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, SpeedDial, SpeedDialIcon, SpeedDialAction } from '@mui/material';

// Import icons for your actions
import HomeIcon from '@mui/icons-material/Home';
import BuildIcon from '@mui/icons-material/Build'; // Icon for Playground
// import MenuIcon from '@mui/icons-material/Menu'; // Alternative main icon
// import CloseIcon from '@mui/icons-material/Close'; // Alternative open icon

// Define the navigation actions
const actions = [
  { icon: <HomeIcon />, name: 'Home', route: '/' },
  { icon: <BuildIcon />, name: 'Playground', route: '/playground' },
  // Add more actions here as needed, excluding '/callback'
  // { icon: <SomeOtherIcon />, name: 'Another Page', route: '/another-page' },
];

const NavigationSpeedDial: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false); // Control SpeedDial open state

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Handler for clicking an action
  const handleActionClick = (route: string) => {
    navigate(route);
    handleClose(); // Close the dial after navigation
  };

  return (
    <Box
      sx={{
        position: 'fixed', // Keep it fixed on the screen
        bottom: 16, // Adjust spacing from bottom
        right: 16, // Adjust spacing from right
        zIndex: (theme) => theme.zIndex.drawer + 1, // Ensure it's above most content
        height: 320, // Example height, adjust based on number of actions
        transform: 'translateZ(0px)', // Needed for positioning context
        flexGrow: 1, // Needed for positioning context
      }}
    >
      <SpeedDial
        ariaLabel="Navigation speed dial"
        sx={{ position: 'absolute', bottom: 0, right: 0 }}
        icon={<SpeedDialIcon /* openIcon={<CloseIcon />} */ />} // Default icons, can customize
        onClose={handleClose}
        onOpen={handleOpen}
        open={open}
        direction="up" // Actions appear upwards
      >
        {actions.map((action) => (
          <SpeedDialAction
            key={action.name}
            icon={action.icon}
            tooltipTitle={action.name}
            tooltipOpen // Make tooltips always visible when dial is open on desktop
            onClick={() => handleActionClick(action.route)}
          />
        ))}
      </SpeedDial>
    </Box>
  );
};

export default NavigationSpeedDial;
