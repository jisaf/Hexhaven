import { GiCrossedSwords, GiRun } from 'react-icons/gi';
import styles from './ActionButtons.module.css';

interface ActionButtonsProps {
  hasAttack: boolean;
  hasMove: boolean;
  attackMode: boolean;
  isMyTurn: boolean;
  onAttackClick: () => void;
  onMoveClick: () => void;
}

export function ActionButtons({
  hasAttack,
  hasMove,
  attackMode,
  isMyTurn,
  onAttackClick,
  onMoveClick,
}: ActionButtonsProps) {
  // Don't show buttons if not your turn or no actions available
  if (!isMyTurn || (!hasAttack && !hasMove)) {
    return null;
  }

  return (
    <div className={styles.actionButtons}>
      {hasAttack && (
        <button
          onClick={onAttackClick}
          className={`${styles.actionButton} ${styles.attackButton} ${attackMode ? styles.active : ''}`}
          aria-label="Attack Mode"
          title="Attack Mode"
        >
          <GiCrossedSwords />
          <span>Attack</span>
        </button>
      )}
      {hasMove && (
        <button
          onClick={onMoveClick}
          className={`${styles.actionButton} ${styles.moveButton} ${!attackMode ? styles.active : ''}`}
          aria-label="Move Mode"
          title="Move Mode"
        >
          <GiRun />
          <span>Move</span>
        </button>
      )}
    </div>
  );
}
