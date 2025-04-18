// src/pages/TracksPage.tsx
import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const TracksPage: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <SelectionPageLayout 
      itemType="song" 
      year={currentYear} 
      pageTitle="Track Selection"
    />
  );
};

export default TracksPage;
