/**
 * ScenarioCard Component (US5 - T176)
 *
 * Displays a scenario card with:
 * - Scenario name
 * - Difficulty indicator (1-3 scale with visual stars/badges)
 * - Primary objective
 * - Visual selection state
 */

import { useTranslation } from 'react-i18next';

export interface ScenarioCardProps {
  id: string;
  name: string;
  difficulty: number;
  objective: string;
  isSelected?: boolean;
  onSelect: (scenarioId: string) => void;
}

export function ScenarioCard({
  id,
  name,
  difficulty,
  objective,
  isSelected = false,
  onSelect,
}: ScenarioCardProps) {
  const { t } = useTranslation();

  // Render difficulty stars
  const renderDifficulty = () => {
    const stars = [];
    for (let i = 0; i < 3; i++) {
      stars.push(
        <span key={i} className={`difficulty-star ${i < difficulty ? 'filled' : 'empty'}`}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  return (
    <button
      className={`scenario-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(id)}
      data-testid={`scenario-card-${id}`}
    >
      <div className="scenario-header">
        <h4 className="scenario-name" data-testid="scenario-name">
          {name}
        </h4>
        <div className="scenario-difficulty" data-testid="scenario-difficulty">
          <span className="difficulty-label">{t('scenario.difficulty', 'Difficulty')}:</span>
          <div className="difficulty-stars">{renderDifficulty()}</div>
          <span className="difficulty-number">{difficulty}</span>
        </div>
      </div>

      <div className="scenario-objective" data-testid="scenario-objective">
        <span className="objective-label">🎯 {t('scenario.objective', 'Objective')}:</span>
        <p className="objective-text">{objective}</p>
      </div>

      {isSelected && (
        <div className="selected-indicator">
          ✓ {t('scenario.selected', 'Selected')}
        </div>
      )}

      <style>{`
        .scenario-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 20px;
          background: #2c2c2c;
          border: 3px solid #444;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
          width: 100%;
        }

        .scenario-card:hover {
          border-color: #3b82f6;
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(59, 130, 246, 0.2);
        }

        .scenario-card.selected {
          border-color: #10b981;
          background: rgba(16, 185, 129, 0.1);
        }

        .scenario-header {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .scenario-name {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
        }

        .scenario-difficulty {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .difficulty-label {
          font-size: 12px;
          color: #999;
          font-weight: 500;
          text-transform: uppercase;
        }

        .difficulty-stars {
          display: flex;
          gap: 2px;
        }

        .difficulty-star {
          font-size: 14px;
        }

        .difficulty-star.filled {
          filter: none;
        }

        .difficulty-star.empty {
          filter: grayscale(1) opacity(0.3);
        }

        .difficulty-number {
          font-size: 14px;
          font-weight: 600;
          color: #f59e0b;
          background: rgba(245, 158, 11, 0.1);
          padding: 2px 8px;
          border-radius: 4px;
        }

        .scenario-objective {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .objective-label {
          font-size: 12px;
          color: #999;
          font-weight: 600;
          text-transform: uppercase;
        }

        .objective-text {
          margin: 0;
          font-size: 14px;
          color: #ddd;
          line-height: 1.4;
        }

        .selected-indicator {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 6px 12px;
          font-size: 13px;
          font-weight: 600;
          color: #ffffff;
          background: #10b981;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        @media (max-width: 480px) {
          .scenario-card {
            padding: 16px;
          }

          .scenario-name {
            font-size: 16px;
          }

          .objective-text {
            font-size: 13px;
          }
        }
      `}</style>
    </button>
  );
}
