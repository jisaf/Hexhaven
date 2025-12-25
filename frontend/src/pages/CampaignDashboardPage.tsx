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
import { CampaignView } from '../components/lobby/CampaignView';
import styles from './CampaignDashboardPage.module.css';

export const CampaignDashboardPage: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const navigate = useNavigate();

  // Navigate back to campaigns hub
  const handleBack = () => {
    navigate('/campaigns');
  };

  // Navigate to campaign scenario lobby
  const handleStartGame = (scenarioId: string, campId: string, characterIds: string[]) => {
    // Pass character selections via URL query params (more robust than sessionStorage)
    const params = new URLSearchParams();
    if (characterIds.length > 0) {
      params.set('characters', characterIds.join(','));
    }
    const queryString = params.toString();
    navigate(`/campaigns/${campId}/scenario/${scenarioId}${queryString ? `?${queryString}` : ''}`);
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
