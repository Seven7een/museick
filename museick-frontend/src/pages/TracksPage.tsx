// src/pages/TracksPage.tsx
import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const TracksPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // Or get from state/context/props

  return (
    <SelectionPageLayout itemType="track" year={currentYear} />
  );
};

export default TracksPage;
