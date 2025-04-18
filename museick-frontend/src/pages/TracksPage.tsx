import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const TracksPage: React.FC = () => {
  const currentYear = new Date().getFullYear(); // TODO: Make this available for multiple years

  return (
    <SelectionPageLayout 
      itemType="track"
      year={currentYear} 
      pageTitle="Track Selection"
    />
  );
};

export default TracksPage;
