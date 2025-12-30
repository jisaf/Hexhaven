/**
 * Create Character Modal Component
 * Modal dialog for creating characters within campaign flow
 * Wraps CharacterCreationForm and handles modal-specific UX
 */

import { CharacterCreationForm } from './CharacterCreationForm';
import type { CharacterResponse } from '../types/character.types';
import styles from './CreateCharacterModal.module.css';

interface CreateCharacterModalProps {
  onSuccess: (character: CharacterResponse) => void;
  onCancel: () => void;
}

export function CreateCharacterModal({
  onSuccess,
  onCancel,
}: CreateCharacterModalProps) {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Create New Character</h2>
          <button
            className={styles.closeButton}
            onClick={onCancel}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className={styles.modalContent}>
          <CharacterCreationForm
            onSuccess={(character) => {
              onSuccess(character);
            }}
            onCancel={onCancel}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}
