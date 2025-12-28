/**
 * Campaign Join Page Component
 *
 * Page for joining campaigns via invite tokens
 * - Shows campaign preview (public info)
 * - Allows character selection
 * - Handles join flow
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService, type CampaignPublicInfo } from '../services/campaign.service';
import { UserCharacterSelect } from '../components/UserCharacterSelect';
import styles from './CampaignJoinPage.module.css';

export const CampaignJoinPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [campaignInfo, setCampaignInfo] = useState<CampaignPublicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  const loadCampaignInfo = useCallback(async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      // Validate token without consuming it
      const info = await campaignService.validateInviteToken(token);
      setCampaignInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate('/campaigns');
      return;
    }

    loadCampaignInfo();
  }, [token, navigate, loadCampaignInfo]);

  const handleJoin = async () => {
    setShowCharacterSelect(true);
  };

  const handleCharacterSelect = async (characterId: string) => {
    if (!token) return;

    setIsJoining(true);
    setError(null);

    try {
      const campaign = await campaignService.joinViaToken(token, characterId);
      // Navigate to campaign dashboard
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join campaign');
    } finally {
      setIsJoining(false);
    }
  };

  const handleCancel = () => {
    navigate('/campaigns');
  };

  if (isLoading) {
    return (
      <div className={styles['campaign-join-page']}>
        <div className={styles.loading}>Loading campaign...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles['campaign-join-page']}>
        <div className={styles['error-container']}>
          <h2>Unable to Join Campaign</h2>
          <p className={styles['error-message']}>{error}</p>
          <button onClick={handleCancel} className={styles['back-button']}>
            Back to Campaigns
          </button>
        </div>
      </div>
    );
  }

  if (!campaignInfo) {
    return null;
  }

  if (showCharacterSelect) {
    return (
      <div className={styles['campaign-join-page']}>
        <div className={styles['character-select-container']}>
          <h2>Select a Character</h2>
          <p>Choose a character to join {campaignInfo.name}</p>
          <UserCharacterSelect
            onSelect={handleCharacterSelect}
          />
          <div className={styles['action-buttons']}>
            <button onClick={() => setShowCharacterSelect(false)} className={styles['cancel-button']}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles['campaign-join-page']}>
      <div className={styles['campaign-preview']}>
        <h1>Join Campaign</h1>

        <div className={styles['campaign-card']}>
          <h2>{campaignInfo.name}</h2>

          {campaignInfo.description && (
            <p className={styles.description}>{campaignInfo.description}</p>
          )}

          <div className={styles['campaign-stats']}>
            <div className={styles.stat}>
              <span className={styles['stat-label']}>Death Mode</span>
              <span className={styles['stat-value']}>{campaignInfo.deathMode}</span>
            </div>

            <div className={styles.stat}>
              <span className={styles['stat-label']}>Prosperity</span>
              <span className={styles['stat-value']}>{campaignInfo.prosperityLevel}</span>
            </div>

            <div className={styles.stat}>
              <span className={styles['stat-label']}>Players</span>
              <span className={styles['stat-value']}>{campaignInfo.playerCount}</span>
            </div>

            <div className={styles.stat}>
              <span className={styles['stat-label']}>Progress</span>
              <span className={styles['stat-value']}>
                {campaignInfo.completedScenariosCount} / {campaignInfo.totalScenariosCount} scenarios
              </span>
            </div>
          </div>

          {campaignInfo.requireUniqueClasses && (
            <div className={styles['info-banner']}>
              This campaign requires unique character classes
            </div>
          )}

          {campaignInfo.isCompleted && (
            <div className={styles['warning-banner']}>
              This campaign has been completed
            </div>
          )}
        </div>

        <div className={styles['action-buttons']}>
          <button onClick={handleCancel} className={styles['cancel-button']}>
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={isJoining || campaignInfo.isCompleted}
            className={styles['join-button']}
          >
            {isJoining ? 'Joining...' : 'Join Campaign'}
          </button>
        </div>
      </div>
    </div>
  );
};
