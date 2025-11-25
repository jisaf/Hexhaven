
import React from 'react';
import styles from './FlyoutPanel.module.css';

export interface FlyoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  children: React.ReactNode;
}

export const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ isOpen, onClose, onReset, children }) => {
  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeButton} onClick={onClose}>X</button>
      <button className={styles.resetButton} onClick={onReset}>Reset</button>
      <div className={styles.content}>
        {children}
      </div>
    </div>
  );
};
