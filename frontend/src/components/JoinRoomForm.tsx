/**
 * JoinRoomForm Component
 *
 * Combined form for entering room code and nickname to join a game.
 */

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';

export interface JoinRoomFormProps {
  onSubmit: (roomCode: string, nickname: string) => void;
  isLoading?: boolean;
  error?: string;
  initialNickname?: string;
  initialRoomCode?: string;
  isAuthenticated?: boolean;
}

export function JoinRoomForm({
  onSubmit,
  isLoading,
  error,
  initialNickname = '',
  initialRoomCode = '',
  isAuthenticated = false
}: JoinRoomFormProps) {
  const { t } = useTranslation('lobby');
  const [roomCode, setRoomCode] = useState(initialRoomCode.toUpperCase());
  const [nickname, setNickname] = useState(initialNickname);
  const [touched, setTouched] = useState({ roomCode: false, nickname: false });

  const isRoomCodeValid = roomCode.length === 6 && /^[A-Z0-9]{6}$/.test(roomCode);
  const isNicknameValid = nickname.length >= 1 && nickname.length <= 50;
  // For authenticated users, nickname is pre-filled and always valid
  const isFormValid = isRoomCodeValid && (isAuthenticated || isNicknameValid);

  const handleRoomCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    setRoomCode(value.slice(0, 6));
  };

  const handleNicknameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.slice(0, 50);
    setNickname(value);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched({ roomCode: true, nickname: true });

    if (isFormValid && !isLoading) {
      onSubmit(roomCode, nickname);
    }
  };

  const showRoomCodeError = touched.roomCode && !isRoomCodeValid && roomCode.length > 0;
  const showNicknameError = touched.nickname && !isNicknameValid && nickname.length > 0;

  return (
    <form onSubmit={handleSubmit} className="join-room-form">
      <div className="form-fields">
        <div className="field-group">
          <label htmlFor="room-code-input">{t('roomCode', 'Room Code')}</label>
          <input
            id="room-code-input"
            type="text"
            value={roomCode}
            onChange={handleRoomCodeChange}
            onBlur={() => setTouched(prev => ({ ...prev, roomCode: true }))}
            placeholder={t('enterRoomCode', 'Enter Room Code')}
            maxLength={6}
            disabled={isLoading}
            className={`input-field ${showRoomCodeError ? 'error' : ''} ${isRoomCodeValid ? 'valid' : ''}`}
            aria-label={t('roomCodeLabel', 'Room code')}
            aria-invalid={showRoomCodeError ? 'true' : 'false'}
            autoComplete="off"
            data-testid="room-code-input"
          />
          {showRoomCodeError && (
            <span className="error-message">
              {t('invalidRoomCode', 'Invalid room code (6 characters required)')}
            </span>
          )}
        </div>

        <div className="field-group">
          <label htmlFor="nickname-input">
            {isAuthenticated ? t('username', 'Username') : t('nickname', 'Nickname')}
          </label>
          <input
            id="nickname-input"
            type="text"
            value={nickname}
            onChange={handleNicknameChange}
            onBlur={() => setTouched(prev => ({ ...prev, nickname: true }))}
            placeholder={isAuthenticated ? '' : t('enterNickname', 'Enter your nickname')}
            maxLength={50}
            disabled={isLoading || isAuthenticated}
            className={`input-field ${showNicknameError ? 'error' : ''} ${isNicknameValid ? 'valid' : ''}`}
            aria-label={isAuthenticated ? t('usernameLabel', 'Username') : t('nicknameLabel', 'Nickname')}
            aria-invalid={showNicknameError ? 'true' : 'false'}
            autoComplete="off"
            data-testid="nickname-input"
          />
          {showNicknameError && !isAuthenticated && (
            <span className="error-message">
              {t('invalidNickname', 'Nickname must be 1-50 characters')}
            </span>
          )}
        </div>

        <button
          type="submit"
          disabled={!isFormValid || isLoading}
          className="submit-button"
          aria-label={t('joinRoom', 'Join Room')}
        >
          {isLoading ? t('joining', 'Joining...') : t('join', 'Join')}
        </button>
      </div>

      {error && (
        <div className="form-error" role="alert" data-testid="error-message">
          {error}
        </div>
      )}

      <style>{`
        .join-room-form {
          width: 100%;
          max-width: 400px;
        }

        .form-fields {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .field-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-group label {
          font-size: 14px;
          font-weight: 600;
          color: #aaa;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .input-field {
          width: 100%;
          padding: 16px;
          font-size: 18px;
          border: 2px solid #444;
          border-radius: 8px;
          background: #2c2c2c;
          color: #ffffff;
          transition: all 0.2s;
        }

        .input-field:focus {
          outline: none;
          border-color: #5a9fd4;
          box-shadow: 0 0 0 3px rgba(90, 159, 212, 0.1);
        }

        .input-field.error {
          border-color: #ef4444;
        }

        .input-field.valid {
          border-color: #10b981;
        }

        .input-field:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .input-field::placeholder {
          color: #666;
        }

        .submit-button {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 56px;
          background-color: #5a9fd4;
          color: white;
        }

        .submit-button:hover:not(:disabled) {
          background-color: #4a8fc4;
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(90, 159, 212, 0.4);
        }

        .submit-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          color: #ef4444;
          font-size: 14px;
        }

        .form-error {
          margin-top: 16px;
          padding: 12px;
          text-align: center;
          color: #ef4444;
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid #ef4444;
          border-radius: 8px;
          font-size: 14px;
        }

        @media (max-width: 768px) {
          .input-field {
            font-size: 16px;
            padding: 14px;
          }

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
