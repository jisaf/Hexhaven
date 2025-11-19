/**
 * ScenarioSelectionPanel Component (US5 - T177, T178)
 *
 * Host-only panel for browsing and selecting scenarios.
 * Features:
 * - Fetches scenarios from API
 * - Displays scenario cards in grid layout
 * - Allows host to select scenario for game
 * - Integrates with WebSocket for multiplayer coordination
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScenarioCard } from './ScenarioCard';
import { getApiUrl } from '../config/api';

interface Scenario {
  id: string;
  name: string;
  difficulty: number;
}

export interface ScenarioSelectionPanelProps {
  selectedScenarioId?: string;
  onSelectScenario: (scenarioId: string) => void;
}

export function ScenarioSelectionPanel({
  selectedScenarioId,
  onSelectScenario,
}: ScenarioSelectionPanelProps) {
  const { t } = useTranslation();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch scenarios from API
  useEffect(() => {
    const fetchScenarios = async () => {
      try {
        setLoading(true);
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/scenarios`);

        if (!response.ok) {
          throw new Error('Failed to fetch scenarios');
        }

        const data = await response.json();
        setScenarios(data.scenarios || []);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch scenarios:', err);
        setError(t('scenario.fetchError', 'Failed to load scenarios'));
      } finally {
        setLoading(false);
      }
    };

    fetchScenarios();
  }, [t]);

  // Scenario objectives mapping (from scenarios.json)
  const scenarioObjectives: Record<string, string> = {
    'scenario-1': 'Kill all enemies',
    'scenario-2': 'Survive 6 rounds',
    'scenario-3': 'Kill the Inox Shaman (boss)',
    'scenario-4': 'Kill all enemies',
    'scenario-5': 'Kill all elemental demons',
  };

  if (loading) {
    return (
      <div className="scenario-panel loading" data-testid="scenario-selection-panel">
        <p>{t('scenario.loading', 'Loading scenarios...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="scenario-panel error" data-testid="scenario-selection-panel">
        <p className="error-message">{error}</p>
        <style>{`
          .error-message {
            color: #ef4444;
            font-size: 14px;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="scenario-panel" data-testid="scenario-selection-panel">
      <h3 className="panel-title">
        {t('scenario.selectScenario', 'Select Scenario')}
        <span className="host-badge">{t('lobby:hostOnly', 'Host Only')}</span>
      </h3>

      <div className="scenario-grid">
        {scenarios.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            id={scenario.id}
            name={scenario.name}
            difficulty={scenario.difficulty}
            objective={scenarioObjectives[scenario.id] || 'Complete the scenario'}
            isSelected={selectedScenarioId === scenario.id}
            onSelect={onSelectScenario}
          />
        ))}
      </div>

      <style>{`
        .scenario-panel {
          width: 100%;
          max-width: 1000px;
          margin: 24px auto;
          padding: 24px;
          background: #1a1a1a;
          border-radius: 12px;
          border: 2px solid #333;
        }

        .scenario-panel.loading,
        .scenario-panel.error {
          text-align: center;
          padding: 40px;
          color: #999;
        }

        .panel-title {
          margin: 0 0 20px 0;
          font-size: 20px;
          font-weight: 600;
          color: #ffffff;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .host-badge {
          font-size: 12px;
          font-weight: 600;
          color: #ffffff;
          background: #3b82f6;
          padding: 4px 12px;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .scenario-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        @media (max-width: 768px) {
          .scenario-panel {
            padding: 16px;
          }

          .scenario-grid {
            grid-template-columns: 1fr;
          }

          .panel-title {
            font-size: 18px;
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}
