/**
 * GameHints Component
 *
 * Displays contextual hints for attack mode and character movement.
 */

import { useTranslation } from 'react-i18next';
import styles from './GameHints.module.css';

interface GameHintsProps {
  attackMode: boolean;
  showMovementHint: boolean;
}

export function GameHints({ attackMode, showMovementHint }: GameHintsProps) {
  const { t } = useTranslation();

  if (attackMode) {
    return (
      <div className={styles.attackModeHint}>
        {t('game:attackHint', 'Select an enemy to attack')}
      </div>
    );
  }

  if (showMovementHint) {
    return (
      <div className={styles.movementHint}>
        {t('game:movementHint', 'Tap a highlighted hex to move your character')}
      </div>
    );
  }

  return null;
}
