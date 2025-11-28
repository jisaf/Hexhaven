import React from 'react';
import type { TextModule as TextModuleProps } from '../../../shared/types';
import styles from './TextModule.module.css';

const TextModule: React.FC<TextModuleProps> = ({ text }) => {
  return (
    <div className={styles.textModule}>
      {text}
    </div>
  );
};

export default TextModule;
