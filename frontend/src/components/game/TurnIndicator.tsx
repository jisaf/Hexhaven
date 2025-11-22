/**
 * TurnIndicator Component
 *
 * Displays whose turn it is in the game.
 */

import { useTranslation } from 'react-i18next';
import styles from './TurnIndicator.module.css';

interface TurnIndicatorProps {
  isMyTurn: boolean;
}

export function TurnIndicator({ isMyTurn }: TurnIndicatorProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.turnIndicator}>
      {isMyTurn ? (
        <span className={styles.yourTurn}>{t('game:yourTurn', 'Your Turn')}</span>
      ) : (
        <span className={styles.waiting}>{t('game:opponentTurn', "Opponent's Turn")}</span>
      )}
    </div>
  );
}
