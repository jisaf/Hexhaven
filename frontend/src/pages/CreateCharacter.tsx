/**
 * Create Character Page (002)
 * Form to create a new character with class selection
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { characterService } from '../services/character.service';
import { getApiUrl } from '../config/api';
import type { CharacterClass } from '../types/character.types';
import './CreateCharacter.css';

export function CreateCharacter() {
  const navigate = useNavigate();
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
      // Fetch character classes from backend
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

    // Trim whitespace from name for validation
    const trimmedName = formData.name.trim();

    // Validate name is not empty (after trimming)
    if (!trimmedName) {
      setError('Character name is required');
      return;
    }

    // Validate name length (1-30 characters after trimming)
    if (trimmedName.length < 1 || trimmedName.length > 30) {
      setError('Character name must be 1-30 characters');
      return;
    }

    // Validate name does not contain HTML tags (XSS prevention)
    if (/<|>/.test(trimmedName)) {
      setError('Character name cannot contain < or > characters');
      return;
    }

    if (!formData.classId) {
      setError('Please select a character class');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await characterService.createCharacter({
        name: trimmedName,
        classId: formData.classId,
      });

      // Redirect to characters list
      navigate('/characters');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create character');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/characters');
  };

  if (loading) {
    return (
      <div className="create-character-page">
        <div className="loading">Loading character classes...</div>
      </div>
    );
  }

  const selectedClass = characterClasses.find(c => c.id === formData.classId);

  return (
    <div className="create-character-page">
      <div className="create-character-container">
        <h1>Create New Character</h1>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="create-character-form">
          <div className="form-group">
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
            />
            <span className="input-hint">1-30 characters</span>
          </div>

          <div className="form-group">
            <label>Select Character Class</label>
            <div className="class-grid">
              {characterClasses.map((charClass) => (
                <div
                  key={charClass.id}
                  className={`class-card ${formData.classId === charClass.id ? 'selected' : ''}`}
                  onClick={() => setFormData({ ...formData, classId: charClass.id })}
                >
                  <h3>{charClass.name}</h3>
                  <div className="class-stats">
                    <div className="class-stat">
                      <span>Health:</span>
                      <span>{charClass.startingHealth}</span>
                    </div>
                    <div className="class-stat">
                      <span>Hand Size:</span>
                      <span>{charClass.handSize}</span>
                    </div>
                  </div>
                  <p className="class-description">{charClass.description}</p>
                </div>
              ))}
            </div>
          </div>

          {selectedClass && (
            <div className="selected-class-info">
              <h3>Selected: {selectedClass.name}</h3>
              <p>{selectedClass.description}</p>
              <div className="starting-stats">
                <div><strong>Starting Health:</strong> {selectedClass.startingHealth}</div>
                <div><strong>Hand Size:</strong> {selectedClass.handSize}</div>
                <div><strong>Available Perks:</strong> {selectedClass.perks.length}</div>
              </div>
            </div>
          )}

          <div className="form-actions">
            <button
              type="button"
              className="cancel-button"
              onClick={handleCancel}
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="submit-button"
              disabled={submitting || !formData.name.trim() || !formData.classId}
            >
              {submitting ? 'Creating...' : 'Create Character'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
