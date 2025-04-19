import React from 'react';
import { IconButton, Box, Typography } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';

interface YearSelectProps {
  currentYear: number;
  onYearSelect: (year: number) => void;
  size?: 'medium' | 'large';
}

const YearSelect: React.FC<YearSelectProps> = ({ 
  currentYear, 
  onYearSelect,
  size = 'medium'
}) => {
  const isLarge = size === 'large';
  const currentDate = new Date();
  const maxYear = currentDate.getFullYear();
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: isLarge ? 3 : 1
      }}
    >
      <IconButton 
        onClick={() => onYearSelect(currentYear - 1)}
        size={size}
      >
        <ArrowBackIcon sx={{ fontSize: isLarge ? 32 : 24 }} />
      </IconButton>
      
      <Typography 
        variant={isLarge ? 'h3' : 'h5'} 
        component="span"
        sx={{ 
          minWidth: isLarge ? '120px' : '80px', 
          textAlign: 'center',
          userSelect: 'none'
        }}
      >
        {currentYear}
      </Typography>
      
      <IconButton 
        onClick={() => onYearSelect(currentYear + 1)}
        size={size}
        disabled={currentYear >= maxYear}
      >
        <ArrowForwardIcon sx={{ fontSize: isLarge ? 32 : 24 }} />
      </IconButton>
    </Box>
  );
};

export default YearSelect;
