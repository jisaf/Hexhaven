
import React from 'react';
import styles from './FlyoutPanel.module.css';

export interface FlyoutPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  onExportToPng: () => void;
  onSaveToServer: () => void;
  children: React.ReactNode;
}

export const FlyoutPanel: React.FC<FlyoutPanelProps> = ({ isOpen, onClose, onReset, onExportToPng, onSaveToServer, children }) => {
  return (
    <div className={`${styles.panel} ${isOpen ? styles.open : ''}`}>
      <button className={styles.closeButton} onClick={onClose}>X</button>
      <button className={styles.resetButton} onClick={onReset}>Reset</button>
      <div className={styles.content}>
        {children}
        <div className={styles.actions}>
          <hr />
          <h4>Actions</h4>
          <button onClick={onExportToPng}>Export as PNG</button>
          <button onClick={onSaveToServer}>Save to Server</button>
        </div>
      </div>
    </div>
  );
};
