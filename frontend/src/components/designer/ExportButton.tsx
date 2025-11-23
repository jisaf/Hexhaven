
import React from 'react';

interface ExportButtonProps {
  onExport: () => void;
  isDisabled: boolean;
}

const ExportButton: React.FC<ExportButtonProps> = ({ onExport, isDisabled }) => {
  return (
    <div style={{ padding: '1rem', borderTop: '1px solid #4a5568' }}>
      <button onClick={onExport} disabled={isDisabled} style={{width: '100%'}}>
        Export as PNG
      </button>
    </div>
  );
};

export default ExportButton;
