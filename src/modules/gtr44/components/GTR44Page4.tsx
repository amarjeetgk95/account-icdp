import React from 'react';
import { GTR44FormData } from '../types';
import { GTR44CertificationPage4 } from './GTR44Certification';

interface GTR44Page4Props {
  data: GTR44FormData;
  readOnly?: boolean;
}

export const GTR44Page4: React.FC<GTR44Page4Props> = ({ data }) => {
  return (
    <div className="gtr-page" id="gtr44-page-4">
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          fontFamily: "'Times New Roman', Times, serif",
          color: '#000000',
        }}
      >
        <GTR44CertificationPage4 data={data} />
      </div>
    </div>
  );
};
