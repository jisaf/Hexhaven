/**
 * GameHints Component
 *
 * Displays contextual hints for attack mode and character movement.
 */

import { useTranslation } from 'react-i18next';
import styles from './GameHints.module.css';
import { useState } from 'react';

interface GameHintsProps {
  attackMode: boolean;
  showMovementHint: boolean;
}

export function GameHints({ attackMode, showMovementHint }: GameHintsProps) {
  const { t } = useTranslation();
  const [dismissedAttackMode, setDismissedAttackMode] = useState(false);
  const [dismissedMovementHint, setDismissedMovementHint] = useState(false);

  const handleDismiss = () => {
    if (attackMode) {
      setDismissedAttackMode(true);
    } else if (showMovementHint) {
      setDismissedMovementHint(true);
    }
  };

  if ((!attackMode && !showMovementHint) || (attackMode && dismissedAttackMode) || (showMovementHint && dismissedMovementHint)) {
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
