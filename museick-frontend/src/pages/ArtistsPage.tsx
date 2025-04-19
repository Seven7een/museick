import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const ArtistsPage: React.FC = () => {
  return (
    <SelectionPageLayout 
      itemType="artist" 
      pageTitle="Artist Selection"
    />
  );
};

export default ArtistsPage;
