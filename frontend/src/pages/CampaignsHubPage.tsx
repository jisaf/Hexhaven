/**
 * Campaigns Hub Page Component (Issue #315)
 *
 * Standalone page for viewing and managing campaigns:
 * - Lists user's campaigns with progress summary
 * - Create new campaign from templates
 * - Navigate to Campaign Dashboard on selection
 */

import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CampaignsList } from '../components/lobby/CampaignsList';
import styles from './CampaignsHubPage.module.css';

export const CampaignsHubPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation(['common', 'lobby']);

  // Navigate to campaign dashboard when selected
  const handleSelectCampaign = (campaignId: string) => {
    navigate(`/campaigns/${campaignId}`);
  };

  return (
    <div className={styles.campaignsHubContainer}>
      <div className={styles.campaignsHubContent}>
        {/* Header */}
        <div className={styles.header}>
          <button
            className={styles.backButton}
            onClick={() => navigate(-1)}
            aria-label={t('common:back', 'Back')}
          >
            ← {t('common:back', 'Back')}
          </button>
          <h1 className={styles.title}>{t('lobby:campaigns', 'Campaigns')}</h1>
        </div>

        {/* Campaigns List */}
        <CampaignsList onSelectCampaign={handleSelectCampaign} />
      </div>
    </div>
  );
};
