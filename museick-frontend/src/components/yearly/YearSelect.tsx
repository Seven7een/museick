import React, { useState } from 'react';
import { 
  Button, Dialog, DialogTitle, DialogContent, 
  Grid, IconButton, Typography
} from '@mui/material';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

const MIN_YEAR = 1970;
const MAX_YEAR = new Date().getFullYear();

interface YearSelectProps {
  currentYear: number;
  onYearSelect: (year: number) => void;
}

const YearSelect: React.FC<YearSelectProps> = ({ currentYear, onYearSelect }) => {
  const [open, setOpen] = useState(false);
  const [decade, setDecade] = useState(Math.floor(currentYear / 10) * 10);

  const handleYearClick = (year: number) => {
    onYearSelect(year);
    setOpen(false);
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        startIcon={<CalendarMonthIcon />}
        sx={{ ml: 2 }}
      >
        {currentYear}
      </Button>
      
      <Dialog 
        open={open} 
        onClose={() => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <IconButton 
            onClick={() => setDecade(prev => Math.max(MIN_YEAR, prev - 10))}
            disabled={decade <= MIN_YEAR}
          >
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h6">
            {decade}s
          </Typography>
          <IconButton 
            onClick={() => setDecade(prev => Math.min(MAX_YEAR - 9, prev + 10))}
            disabled={decade >= MAX_YEAR - 9}
          >
            <ArrowForwardIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          <Grid container spacing={1}>
            {Array.from({ length: 10 }, (_, i) => decade + i).map(year => (
              <Grid size={3} key={year}>
                <Button
                  fullWidth
                  variant={year === currentYear ? 'contained' : 'outlined'}
                  onClick={() => handleYearClick(year)}
                  disabled={year > MAX_YEAR || year < MIN_YEAR}
                >
                  {year}
                </Button>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default YearSelect;
