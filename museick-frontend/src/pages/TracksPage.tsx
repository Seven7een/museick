import React from 'react';
import SelectionPageLayout from '@/components/layout/SelectionPageLayout';

const TracksPage: React.FC = () => {
  return (
    <SelectionPageLayout 
      itemType="track" 
      pageTitle="Track Selection"
    />
  );
};

export default TracksPage;
