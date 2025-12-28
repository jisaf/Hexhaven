/**
 * Campaign Join Page Component
 *
 * Page for joining campaigns via invite tokens
 * - Shows campaign preview (public info)
 * - Allows character selection
 * - Handles join flow
 */

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignService, type CampaignPublicInfo } from '../services/campaign.service';
import { UserCharacterSelect } from '../components/UserCharacterSelect';

export const CampaignJoinPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [campaignInfo, setCampaignInfo] = useState<CampaignPublicInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCharacterSelect, setShowCharacterSelect] = useState(false);

  useEffect(() => {
    if (!token) {
      navigate('/campaigns');
      return;
    }

    loadCampaignInfo();
  }, [token]);

  const loadCampaignInfo = async () => {
    if (!token) return;

    setIsLoading(true);
    setError(null);

    try {
      // First validate the token by trying to join (without character)
      const campaign = await campaignService.joinViaToken(token);

      // Get public info
      const info = await campaignService.getCampaignPublicInfo(campaign.id);
      setCampaignInfo(info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaign');
    } finally {
      setIsLoading(false);
    }
  };

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
      <div className="campaign-join-page">
        <div className="loading">Loading campaign...</div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div className="campaign-join-page">
        <div className="error-container">
          <h2>Unable to Join Campaign</h2>
          <p className="error-message">{error}</p>
          <button onClick={handleCancel} className="back-button">
            Back to Campaigns
          </button>
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  if (!campaignInfo) {
    return null;
  }

  if (showCharacterSelect) {
    return (
      <div className="campaign-join-page">
        <div className="character-select-container">
          <h2>Select a Character</h2>
          <p>Choose a character to join {campaignInfo.name}</p>
          <UserCharacterSelect
            onSelectCharacter={handleCharacterSelect}
            onCancel={() => setShowCharacterSelect(false)}
          />
        </div>
        <style>{pageStyles}</style>
      </div>
    );
  }

  return (
    <div className="campaign-join-page">
      <div className="campaign-preview">
        <h1>Join Campaign</h1>

        <div className="campaign-card">
          <h2>{campaignInfo.name}</h2>

          {campaignInfo.description && (
            <p className="description">{campaignInfo.description}</p>
          )}

          <div className="campaign-stats">
            <div className="stat">
              <span className="stat-label">Death Mode</span>
              <span className="stat-value">{campaignInfo.deathMode}</span>
            </div>

            <div className="stat">
              <span className="stat-label">Prosperity</span>
              <span className="stat-value">{campaignInfo.prosperityLevel}</span>
            </div>

            <div className="stat">
              <span className="stat-label">Players</span>
              <span className="stat-value">{campaignInfo.playerCount}</span>
            </div>

            <div className="stat">
              <span className="stat-label">Progress</span>
              <span className="stat-value">
                {campaignInfo.completedScenariosCount} / {campaignInfo.totalScenariosCount} scenarios
              </span>
            </div>
          </div>

          {campaignInfo.requireUniqueClasses && (
            <div className="info-banner">
              This campaign requires unique character classes
            </div>
          )}

          {campaignInfo.isCompleted && (
            <div className="warning-banner">
              This campaign has been completed
            </div>
          )}
        </div>

        <div className="action-buttons">
          <button onClick={handleCancel} className="cancel-button">
            Cancel
          </button>
          <button
            onClick={handleJoin}
            disabled={isJoining || campaignInfo.isCompleted}
            className="join-button"
          >
            {isJoining ? 'Joining...' : 'Join Campaign'}
          </button>
        </div>
      </div>

      <style>{pageStyles}</style>
    </div>
  );
};

const pageStyles = `
  .campaign-join-page {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .loading,
  .error-container,
  .campaign-preview,
  .character-select-container {
    background: white;
    border-radius: 12px;
    padding: 32px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    max-width: 600px;
    width: 100%;
  }

  .loading {
    text-align: center;
    font-size: 18px;
    color: #666;
  }

  .error-container {
    text-align: center;
  }

  .error-container h2 {
    color: #e74c3c;
    margin: 0 0 16px 0;
  }

  .error-message {
    color: #666;
    margin: 0 0 24px 0;
  }

  .campaign-preview h1 {
    margin: 0 0 24px 0;
    font-size: 28px;
    color: #333;
    text-align: center;
  }

  .campaign-card {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 24px;
    margin-bottom: 24px;
  }

  .campaign-card h2 {
    margin: 0 0 16px 0;
    font-size: 24px;
    color: #333;
  }

  .description {
    color: #666;
    margin: 0 0 24px 0;
    line-height: 1.6;
  }

  .campaign-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
    margin-bottom: 16px;
  }

  .stat {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .stat-label {
    font-size: 14px;
    color: #999;
    text-transform: uppercase;
    font-weight: 600;
  }

  .stat-value {
    font-size: 18px;
    color: #333;
    font-weight: 600;
  }

  .info-banner,
  .warning-banner {
    padding: 12px;
    border-radius: 6px;
    font-size: 14px;
    text-align: center;
  }

  .info-banner {
    background-color: #e3f2fd;
    color: #1976d2;
    border: 1px solid #90caf9;
  }

  .warning-banner {
    background-color: #fff3e0;
    color: #e65100;
    border: 1px solid #ffb74d;
  }

  .action-buttons {
    display: flex;
    gap: 12px;
  }

  .cancel-button,
  .join-button,
  .back-button {
    flex: 1;
    padding: 16px 24px;
    font-size: 16px;
    font-weight: 600;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .cancel-button,
  .back-button {
    background-color: #e0e0e0;
    color: #333;
  }

  .cancel-button:hover,
  .back-button:hover {
    background-color: #d0d0d0;
  }

  .join-button {
    background-color: #4a90e2;
    color: white;
  }

  .join-button:hover:not(:disabled) {
    background-color: #357abd;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(74, 144, 226, 0.3);
  }

  .join-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  .character-select-container h2 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: #333;
  }

  .character-select-container p {
    margin: 0 0 24px 0;
    color: #666;
  }

  @media (max-width: 768px) {
    .campaign-join-page {
      padding: 16px;
    }

    .campaign-preview,
    .error-container,
    .character-select-container {
      padding: 24px;
    }

    .campaign-stats {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      flex-direction: column;
    }
  }
`;
