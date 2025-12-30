/**
 * Character Creation Form Component
 * Reusable form for creating new characters
 * Used by both CreateCharacter page and CreateCharacterModal
 */

import React, { useState, useEffect } from 'react';
import { characterService } from '../services/character.service';
import { getApiUrl } from '../config/api';
import type { CharacterClass, CharacterResponse } from '../types/character.types';
import styles from './CharacterCreationForm.module.css';

interface CharacterCreationFormProps {
  onSuccess?: (character: CharacterResponse) => void;
  onCancel?: () => void;
  isModal?: boolean;
}

export function CharacterCreationForm({
  onSuccess,
  onCancel,
  isModal = false,
}: CharacterCreationFormProps) {
  const [characterClasses, setCharacterClasses] = useState<CharacterClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    classId: '',
  });

  useEffect(() => {
    loadCharacterClasses();
  }, []);

  const loadCharacterClasses = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${getApiUrl()}/character-classes`);
      if (!response.ok) {
        throw new Error('Failed to load character classes');
      }
      const data = await response.json();
      setCharacterClasses(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load character classes');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = formData.name.trim();

    if (!trimmedName) {
      setError('Character name is required');
      return;
    }

    if (trimmedName.length > 30) {
      setError('Character name must not exceed 30 characters');
      return;
    }

    if (/[<>"'&]/.test(trimmedName)) {
      setError('Character name cannot contain special characters (<, >, ", \', &)');
      return;
    }

    if (!formData.classId) {
      setError('Please select a character class');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const character = await characterService.createCharacter({
        name: trimmedName,
        classId: formData.classId,
      });

      if (onSuccess) {
        onSuccess(character);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setSubmitting(false);
    }
  };

  // Show error with retry option if loading failed and no classes loaded
  if (!loading && error && characterClasses.length === 0) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.errorMessage} role="alert">{error}</div>
        <button
          type="button"
          className={styles.retryButton}
          onClick={loadCharacterClasses}
        >
          Retry Loading
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.formContainer}>
        <div className={styles.loading}>Loading character classes...</div>
      </div>
    );
  }

  const selectedClass = characterClasses.find((c) => c.id === formData.classId);

  const containerClass = isModal ? styles.modalContainer : styles.pageContainer;

  return (
    <div className={containerClass}>
      <form onSubmit={handleSubmit} className={styles.form}>
        {error && (
          <div id="form-error" className={styles.errorMessage} role="alert">
            {error}
          </div>
        )}

        <div className={styles.formGroup}>
          <label htmlFor="name">Character Name</label>
          <input
            type="text"
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter character name"
            minLength={1}
            maxLength={30}
            required
            disabled={submitting}
            aria-describedby={error ? 'form-error name-hint' : 'name-hint'}
            aria-invalid={error ? 'true' : undefined}
          />
          <span id="name-hint" className={styles.inputHint}>1-30 characters</span>
        </div>

        <div className={styles.formGroup}>
          <label id="class-selection-label">Select Character Class</label>
          <div className={styles.classGrid} role="radiogroup" aria-labelledby="class-selection-label">
            {characterClasses.map((charClass) => (
              <div
                key={charClass.id}
                className={`${styles.classCard} ${
                  formData.classId === charClass.id ? styles.selected : ''
                }`}
                onClick={() => setFormData({ ...formData, classId: charClass.id })}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setFormData({ ...formData, classId: charClass.id });
                  }
                }}
                role="radio"
                aria-checked={formData.classId === charClass.id}
                tabIndex={0}
              >
                <h3>{charClass.name}</h3>
                <div className={styles.classStats}>
                  <div className={styles.classStat}>
                    <span>Health:</span>
                    <span>{charClass.startingHealth}</span>
                  </div>
                  <div className={styles.classStat}>
                    <span>Hand Size:</span>
                    <span>{charClass.handSize}</span>
                  </div>
                </div>
                <p className={styles.classDescription}>{charClass.description}</p>
              </div>
            ))}
          </div>
        </div>

        {selectedClass && (
          <div className={styles.selectedClassInfo}>
            <h3>Selected: {selectedClass.name}</h3>
            <p>{selectedClass.description}</p>
            <div className={styles.startingStats}>
              <div>
                <strong>Starting Health:</strong> {selectedClass.startingHealth}
              </div>
              <div>
                <strong>Hand Size:</strong> {selectedClass.handSize}
              </div>
              <div>
                <strong>Available Perks:</strong> {selectedClass.perks.length}
              </div>
            </div>
          </div>
        )}

        <div className={styles.formActions}>
          {onCancel && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onCancel}
              disabled={submitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting || !formData.name.trim() || !formData.classId}
          >
            {submitting ? 'Creating...' : 'Create Character'}
          </button>
        </div>
      </form>
    </div>
  );
}
