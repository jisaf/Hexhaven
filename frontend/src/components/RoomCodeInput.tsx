/**
 * RoomCodeInput Component
 *
 * Input field for entering a 6-character room code to join a game.
 * Features:
 * - Auto-capitalization
 * - 6-character validation
 * - Visual feedback for valid/invalid codes
 * - Touch-optimized input
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export interface RoomCodeInputProps {
  onSubmit: (roomCode: string) => void;
  isLoading?: boolean;
  error?: string;
}

export function RoomCodeInput({ onSubmit, isLoading, error }: RoomCodeInputProps) {
  const { t } = useTranslation();
  const [roomCode, setRoomCode] = useState('');
  const [touched, setTouched] = useState(false);

  const isValid = roomCode.length === 6 && /^[A-Z0-9]{6}$/.test(roomCode);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value.slice(0, 6));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);

    if (isValid && !isLoading) {
      onSubmit(roomCode);
    }
  };

  const showError = touched && !isValid && roomCode.length > 0;
  const hasError = touched && (error || showError);

  return (
    <form onSubmit={handleSubmit} className="room-code-input">
      <div className="input-wrapper">
        <input
          type="text"
          value={roomCode}
          onChange={handleChange}
          onBlur={() => setTouched(true)}
          placeholder={t('lobby.enterRoomCode', 'Enter Room Code')}
          maxLength={6}
          disabled={isLoading}
          className={`room-code-field ${hasError ? 'error' : ''} ${isValid ? 'valid' : ''}`}
          aria-label={t('lobby.roomCodeLabel', 'Room code')}
          aria-invalid={hasError ? 'true' : 'false'}
          aria-describedby={hasError ? 'room-code-error' : undefined}
          autoComplete="off"
          data-testid="room-code-input"
        />
        <button
          type="submit"
          disabled={!isValid || isLoading}
          className="join-button"
          aria-label={t('lobby.joinRoom', 'Join Room')}
          data-testid="join-room-button"
        >
          {isLoading ? t('lobby.joining', 'Joining...') : t('lobby.join', 'Join')}
        </button>
      </div>

      {hasError && (
        <div id="room-code-error" className="error-message" role="alert">
          {error || t('lobby.invalidRoomCode', 'Invalid room code (6 characters required)')}
        </div>
      )}

      <style>{`
        .room-code-input {
          width: 100%;
          max-width: 400px;
          margin: 0 auto;
        }

        .input-wrapper {
          display: flex;
          gap: 12px;
          align-items: stretch;
        }

        .room-code-field {
          flex: 1;
          padding: 14px 16px;
          font-size: 18px;
          font-weight: 600;
          letter-spacing: 0.1em;
          text-align: center;
          text-transform: uppercase;
          border: 2px solid #444;
          border-radius: 8px;
          background: #2c2c2c;
          color: #ffffff;
          outline: none;
          transition: all 0.2s;
          min-height: 44px;
        }

        .room-code-field:focus {
          border-color: #5a9fd4;
          box-shadow: 0 0 0 3px rgba(90, 159, 212, 0.2);
        }

        .room-code-field.valid {
          border-color: #4ade80;
        }

        .room-code-field.error {
          border-color: #ef4444;
        }

        .room-code-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .room-code-field::placeholder {
          color: #888;
          letter-spacing: normal;
        }

        .join-button {
          padding: 14px 24px;
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          background: #5a9fd4;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 100px;
          min-height: 44px;
        }

        .join-button:hover:not(:disabled) {
          background: #4a8fc4;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(90, 159, 212, 0.3);
        }

        .join-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .join-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 8px;
          padding: 8px 12px;
          font-size: 14px;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border-radius: 4px;
          text-align: center;
        }

        @media (max-width: 480px) {
          .input-wrapper {
            flex-direction: column;
          }

          .join-button {
            width: 100%;
          }
        }
      `}</style>
    </form>
  );
}
