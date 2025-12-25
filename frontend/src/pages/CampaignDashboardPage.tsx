/**
 * Campaign Dashboard Page Component (Issue #316)
 *
 * Standalone page for campaign management:
 * - Scenario tree visualization (completed, available, locked)
 * - Party management (characters in campaign)
 * - Campaign stats (prosperity, reputation)
 * - Navigation to campaign scenario lobby to start games
 *
 * Wraps CampaignView component and adapts it for page routing.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignView } from '../components/lobby/CampaignView';
import styles from './CampaignDashboardPage.module.css';

export const CampaignDashboardPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // Navigate back to campaigns hub
  const handleBack = () => {
    navigate('/campaigns');
  };

  // Navigate to campaign scenario lobby
  const handleStartGame = (scenarioId: string, campId: string, characterIds: string[]) => {
    // Store character selections in session storage for the lobby to pick up
    sessionStorage.setItem(`campaign-${campId}-characters`, JSON.stringify(characterIds));
    navigate(`/campaigns/${campId}/scenario/${scenarioId}`);
  };

  // No campaign ID - redirect
  if (!campaignId) {
    navigate('/campaigns');
    return null;
  }

  return (
    <div className={styles.campaignDashboardContainer}>
      <div className={styles.campaignDashboardContent}>
        <CampaignView
          campaignId={campaignId}
          onBack={handleBack}
          onStartGame={handleStartGame}
        />
      </div>
    </div>
  );
};
