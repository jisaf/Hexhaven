/**
 * NicknameInput Component
 *
 * Input field for entering player nickname.
 * Features:
 * - 1-50 character validation
 * - Visual feedback for valid/invalid nicknames
 * - Touch-optimized input
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export interface NicknameInputProps {
  onSubmit: (nickname: string) => void;
  onCancel?: () => void;
  isLoading?: boolean;
  error?: string;
  initialValue?: string;
  showCancel?: boolean;
}

export function NicknameInput({
  onSubmit,
  onCancel,
  isLoading,
  error,
  initialValue = '',
  showCancel = false
}: NicknameInputProps) {
  const { t } = useTranslation('lobby');
  const [nickname, setNickname] = useState(initialValue);
  const [touched, setTouched] = useState(false);

  const isValid = nickname.length >= 1 && nickname.length <= 50;

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 50);
    setNickname(value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (isValid && !isLoading) {
      onSubmit(nickname);
    }
  };

  const showError = touched && !isValid && nickname.length > 0;
  const hasError = touched && (error || showError);

  return (
    <form onSubmit={handleSubmit} className="nickname-input">
      <div className="input-wrapper">
        <input
          type="text"
          value={nickname}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={t('enterNickname', 'Enter your nickname')}
          maxLength={50}
          disabled={isLoading}
          className={`nickname-field ${hasError ? 'error' : ''} ${isValid ? 'valid' : ''}`}
          aria-label={t('nicknameLabel', 'Nickname')}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? 'nickname-error' : undefined}
          autoComplete="off"
          data-testid="nickname-input"
          autoFocus
        />
        <div className="button-group">
          {showCancel && onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="cancel-button"
              aria-label={t('cancel', 'Cancel')}
            >
              {t('cancel', 'Cancel')}
            </button>
          )}
          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="submit-button"
            aria-label={t('continue', 'Continue')}
            data-testid="nickname-submit"
          >
            {isLoading ? t('loading', 'Loading...') : t('continue', 'Continue')}
          </button>
        </div>
      </div>

      {hasError && (
        <div id="nickname-error" className="error-message" role="alert">
          {error || t('invalidNickname', 'Nickname must be 1-50 characters')}
        </div>
      )}

      <style>{`
        .nickname-input {
          width: 100%;
          max-width: 400px;
        }

        .input-wrapper {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .nickname-field {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          border: 2px solid #ddd;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .nickname-field:focus {
          outline: none;
          border-color: #4a90e2;
          box-shadow: 0 0 0 3px rgba(74, 144, 226, 0.1);
        }

        .nickname-field.error {
          border-color: #e74c3c;
        }

        .nickname-field.valid {
          border-color: #2ecc71;
        }

        .nickname-field:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .button-group {
          display: flex;
          gap: 12px;
        }

        .cancel-button,
        .submit-button {
          flex: 1;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 56px;
        }

        .cancel-button {
          background-color: #e0e0e0;
          color: #333;
        }

        .cancel-button:hover:not(:disabled) {
          background-color: #d0d0d0;
        }

        .submit-button {
          background-color: #4a90e2;
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #357abd;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
        }

        .submit-button:disabled,
        .cancel-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          color: #e74c3c;
          font-size: 14px;
          margin-top: 8px;
        }

        @media (max-width: 768px) {
          .nickname-field {
            font-size: 16px;
            padding: 14px;
          }

          .cancel-button,
          .submit-button {
            padding: 14px 20px;
            font-size: 15px;
            min-height: 52px;
          }
        }
      `}</style>
    </form>
  );
}
