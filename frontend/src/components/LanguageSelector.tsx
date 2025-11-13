/**
 * LanguageSelector Component
 *
 * Allows users to manually select their preferred language.
 * Supports: English, Spanish, French, German, Chinese
 *
 * User Story 6: Multi-Lingual Play (T192)
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
];

interface LanguageSelectorProps {
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleLanguageChange = (languageCode: string) => {
    void i18n.changeLanguage(languageCode);
    setIsOpen(false);
  };

  const currentLanguage = LANGUAGES.find(lang => lang.code === i18n.language) || LANGUAGES[0];

  return (
    <div className={`language-selector ${className}`} data-testid="language-selector">
      {/* Current Language Button */}
      <button
        className="language-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select language"
        aria-expanded={isOpen}
        data-testid="language-button"
      >
        <span className="language-flag" role="img" aria-label={currentLanguage.name}>
          {currentLanguage.flag}
        </span>
        <span className="language-name">{currentLanguage.nativeName}</span>
        <span className="dropdown-arrow">{isOpen ? '▲' : '▼'}</span>
      </button>

      {/* Language Dropdown */}
      {isOpen && (
        <div className="language-dropdown" data-testid="language-dropdown">
          {LANGUAGES.map((language) => (
            <button
              key={language.code}
              className={`language-option ${i18n.language === language.code ? 'active' : ''}`}
              onClick={() => handleLanguageChange(language.code)}
              data-testid={`language-option-${language.code}`}
            >
              <span className="language-flag" role="img" aria-label={language.name}>
                {language.flag}
              </span>
              <span className="language-name">{language.nativeName}</span>
              {i18n.language === language.code && (
                <span className="checkmark" aria-label="Selected">✓</span>
              )}
            </button>
          ))}
        </div>
      )}

      <style>{`
        .language-selector {
          position: relative;
          display: inline-block;
        }

        .language-button {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          font-size: 14px;
          cursor: pointer;
          min-width: 140px;
          transition: all 0.2s ease;
        }

        .language-button:hover {
          background: rgba(255, 255, 255, 0.15);
          border-color: rgba(255, 255, 255, 0.3);
        }

        .language-flag {
          font-size: 20px;
        }

        .language-name {
          flex: 1;
          text-align: left;
        }

        .dropdown-arrow {
          font-size: 10px;
          opacity: 0.7;
        }

        .language-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 180px;
          background: rgba(30, 30, 40, 0.98);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
          z-index: 1000;
          overflow: hidden;
        }

        .language-option {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 12px 16px;
          background: transparent;
          border: none;
          color: white;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s ease;
        }

        .language-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .language-option.active {
          background: rgba(100, 150, 255, 0.2);
        }

        .language-option .language-flag {
          font-size: 20px;
        }

        .language-option .language-name {
          flex: 1;
          text-align: left;
        }

        .checkmark {
          color: #4CAF50;
          font-weight: bold;
          font-size: 18px;
        }

        /* Close dropdown when clicking outside */
        @media (max-width: 768px) {
          .language-dropdown {
            min-width: 160px;
          }

          .language-button {
            min-width: 120px;
            font-size: 13px;
          }
        }
      `}</style>
    </div>
  );
};

export default LanguageSelector;
