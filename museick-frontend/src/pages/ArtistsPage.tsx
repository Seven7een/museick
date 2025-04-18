import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const ArtistsPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // TODO: Make this available for multiple years

  return (
    <SelectionPageLayout 
      itemType="artist" 
      year={currentYear} 
      pageTitle="Artist Selection"
    />
  );
};

export default ArtistsPage;
