/**
 * GameHints Component
 *
 * Displays contextual hints for attack mode and character movement.
 */

import { useTranslation } from 'react-i18next';
import styles from './GameHints.module.css';
import { useState, useEffect } from 'react';

interface GameHintsProps {
  attackMode: boolean;
  showMovementHint: boolean;
}

export function GameHints({ attackMode, showMovementHint }: GameHintsProps) {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (attackMode || showMovementHint) {
      setIsVisible(true);
    }
  }, [attackMode, showMovementHint]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  if (attackMode) {
    return (
      <div className={`${styles.hintContainer} ${styles.attackModeHint}`}>
        <span>{t('game:attackHint', 'Select an enemy to attack')}</span>
        <button onClick={handleDismiss} className={styles.dismissButton}>&times;</button>
      </div>
    );
  }

  if (showMovementHint) {
    return (
      <div className={`${styles.hintContainer} ${styles.movementHint}`}>
        <span>{t('game:movementHint', 'Tap a highlighted hex to move your character')}</span>
        <button onClick={handleDismiss} className={styles.dismissButton}>&times;</button>
      </div>
    );
  }

  return null;
}
