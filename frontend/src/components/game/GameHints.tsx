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
  // Track which hint mode was dismissed
  const [dismissedMode, setDismissedMode] = useState<'attack' | 'movement' | null>(null);

  const handleDismiss = () => {
    if (attackMode) {
      setDismissedMode('attack');
    } else if (showMovementHint) {
      setDismissedMode('movement');
    }
  };

  // Determine if we should show the hint
  const shouldShow =
    (attackMode && dismissedMode !== 'attack') ||
    (showMovementHint && dismissedMode !== 'movement');

  if (!shouldShow) {
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
