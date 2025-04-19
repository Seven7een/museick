import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const AlbumsPage: React.FC = () => {
  return (
    <SelectionPageLayout 
      itemType="album" 
      pageTitle="Album Selection"
    />
  );
};

export default AlbumsPage;
