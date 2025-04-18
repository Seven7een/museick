import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const AlbumsPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // TODO: Make this available for multiple years

  return (
    <SelectionPageLayout 
      itemType="album" 
      year={currentYear} 
      pageTitle="Album Selection"
    />
  );
};

export default AlbumsPage;
