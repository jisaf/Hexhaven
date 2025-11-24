
import React from 'react';
import styles from './FlyoutPanel.module.css';

interface FlyoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ isOpen, onClose, children }) => {
  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeButton} onClick={onClose}>X</button>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};
