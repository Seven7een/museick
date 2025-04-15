// src/pages/ArtistsPage.tsx
import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const ArtistsPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // Or get from state/context/props

  return (
    <SelectionPageLayout itemType="artist" year={currentYear} />
  );
};

export default ArtistsPage;
