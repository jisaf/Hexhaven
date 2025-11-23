/**
 * ScenarioDetailView Component
 *
 * Displays detailed information about a selected scenario, including a mini-map
 * and a list of monsters.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getApiUrl } from '../../config/api';
import type { Scenario } from '../../../../shared/types/entities';
import { MiniMap } from './MiniMap';
import { MonsterList } from './MonsterList';
import styles from './ScenarioDetailView.module.css';

interface ScenarioDetailViewProps {
  scenarioId: string;
}

export function ScenarioDetailView({ scenarioId }: ScenarioDetailViewProps) {
  const { t } = useTranslation('lobby');
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scenarioId) {
      setScenario(null);
      return;
    }

    const fetchScenarioDetails = async () => {
      try {
        setLoading(true);
        setError(null);
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/scenarios/${scenarioId}`);

        if (!response.ok) {
          throw new Error('Failed to fetch scenario details');
        }

        const data = await response.json();
        setScenario(data.scenario);
      } catch (err) {
        console.error(`Failed to fetch scenario ${scenarioId}:`, err);
        setError(t('scenario.detailFetchError', 'Could not load scenario details.'));
      } finally {
        setLoading(false);
      }
    };

    fetchScenarioDetails();
  }, [scenarioId, t]);

  if (!scenarioId) {
    return (
      <div className={styles.placeholder}>
        <p>{t('scenario.selectPrompt', 'Select a scenario to see details')}</p>
      </div>
    );
  }

  if (loading) {
    return <div className={styles.loading}>{t('scenario.loadingDetails', 'Loading details...')}</div>;
  }

  if (error) {
    return <div className={styles.error}>{error}</div>;
  }

  if (!scenario) {
    return null;
  }

  return (
    <div className={styles.scenarioDetailView}>
      <h3 className={styles.scenarioTitle}>{scenario.name}</h3>
      <p className={styles.scenarioObjective}>{scenario.objectivePrimary}</p>
      <div className={styles.detailsLayout}>
        <div className={styles.miniMapContainer}>
          <h4>{t('scenario.map', 'Map')}</h4>
          <MiniMap mapLayout={scenario.mapLayout} />
        </div>
        <div className={styles.monsterListContainer}>
          <h4>{t('scenario.monsters', 'Monsters')}</h4>
          <MonsterList monsterGroups={scenario.monsterGroups} />
        </div>
      </div>
    </div>
  );
}
