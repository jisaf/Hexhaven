import React from 'react';
import { HexTargetModule as HexTargetModuleProps } from '../../../shared/types';
import styles from './HexTargetModule.module.css';

const HexTargetModule: React.FC<HexTargetModuleProps> = ({ pattern }) => {
  return (
    <div className={styles.hexTargetModule}>
      {pattern.map((row, rowIndex) => (
        <div key={rowIndex} className={styles.hexRow}>
          {row.map((cell, cellIndex) => (
            <div
              key={cellIndex}
              className={`${styles.hex} ${styles[cell]}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default HexTargetModule;
