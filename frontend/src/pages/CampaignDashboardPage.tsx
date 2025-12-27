/**
 * Campaign Dashboard Page Component (Issue #316)
 *
 * Standalone page for campaign management:
 * - Scenario tree visualization (completed, available, locked)
 * - Party management (characters in campaign)
 * - Campaign stats (prosperity, reputation)
 * - Direct game start (skips intermediate lobby for streamlined flow)
 *
 * Wraps CampaignView component and adapts it for page routing.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { CampaignView } from '../components/lobby/CampaignView';
import { useAutoStartGame } from '../hooks/useAutoStartGame';
import styles from './CampaignDashboardPage.module.css';

export const CampaignDashboardPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { isStarting, error, clearError, startGame } = useAutoStartGame();

  // Navigate back to campaigns hub
  const handleBack = () => {
    navigate('/campaigns');
  };

  // Start game directly - create room and auto-start (skip scenario lobby)
  const handleStartGame = async (scenarioId: string, campId: string, characterIds: string[]) => {
    await startGame(scenarioId, campId, characterIds);
  };

  // No campaign ID - redirect
  if (!campaignId) {
    navigate('/campaigns');
    return null;
  }

  return (
    <div className={styles.campaignDashboardContainer}>
      <div className={styles.campaignDashboardContent}>
        {error && (
          <div className={styles.errorBanner}>
            {error}
            <button onClick={clearError}>✕</button>
          </div>
        )}
        {isStarting && (
          <div className={styles.loadingOverlay}>
            <p>Starting game...</p>
          </div>
        )}
        <CampaignView
          campaignId={campaignId}
          onBack={handleBack}
          onStartGame={handleStartGame}
        />
      </div>
    </div>
  );
};
