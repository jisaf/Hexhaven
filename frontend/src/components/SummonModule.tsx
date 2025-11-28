import React from 'react';
import type { SummonModule as SummonModuleProps } from '../../../shared/types';
import styles from './SummonModule.module.css';

const SummonModule: React.FC<SummonModuleProps> = ({ move, attack, range, health }) => {
  return (
    <div className={styles.summonModule}>
      <span>M: {move}</span>
      <span>A: {attack}</span>
      <span>R: {range}</span>
      <span>H: {health}</span>
    </div>
  );
};

export default SummonModule;
