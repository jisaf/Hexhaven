
import React from 'react';

interface FlyoutPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ isOpen, onToggle, children }) => {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        height: '100%',
        width: '300px',
        backgroundColor: '#2d3748',
        color: 'white',
        transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease-in-out',
        zIndex: 1000,
        boxShadow: '2px 0 10px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ flex: 1, padding: '1rem', overflowY: 'auto' }}>
        {children}
      </div>
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          top: '50%',
          right: '-30px',
          transform: 'translateY(-50%)',
          width: '30px',
          height: '60px',
          backgroundColor: '#2d3748',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          borderTopRightRadius: '8px',
          borderBottomRightRadius: '8px',
          fontSize: '1.2rem'
        }}
      >
        {isOpen ? '<' : '>'}
      </button>
    </div>
  );
};

export default FlyoutPanel;
