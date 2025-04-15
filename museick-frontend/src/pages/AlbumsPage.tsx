// src/pages/AlbumsPage.tsx
import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const AlbumsPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // Or get from state/context/props

  return (
    <SelectionPageLayout itemType="album" year={currentYear} />
  );
};

export default AlbumsPage;
