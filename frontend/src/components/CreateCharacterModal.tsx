/**
 * Create Character Modal Component
 * Modal dialog for creating characters within campaign flow
 * Wraps CharacterCreationForm and handles modal-specific UX
 */

import { useFocusTrap } from '../hooks/useFocusTrap';
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
  // Focus trap for modal accessibility
  const modalRef = useFocusTrap<HTMLDivElement>(true);

  // Handle escape key to close modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <div
      className={styles.overlay}
      onClick={onCancel}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-character-modal-title"
    >
      <div
        ref={modalRef}
        className={styles.modal}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className={styles.modalHeader}>
          <h2 id="create-character-modal-title">Create New Character</h2>
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
            onSuccess={onSuccess}
            onCancel={onCancel}
            isModal={true}
          />
        </div>
      </div>
    </div>
  );
}
