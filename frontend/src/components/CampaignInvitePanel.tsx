/**
 * CampaignInvitePanel Component
 *
 * Allows campaign hosts to:
 * - Invite users by username
 * - View and manage pending invitations
 * - Create and manage shareable invite tokens
 */

import { useState, useEffect, type FormEvent } from 'react';
import { campaignService, type CampaignInvitation, type CampaignInviteToken } from '../services/campaign.service';

export interface CampaignInvitePanelProps {
  campaignId: string;
  onError?: (error: string) => void;
  onSuccess?: (message: string) => void;
}

export function CampaignInvitePanel({
  campaignId,
  onError,
  onSuccess,
}: CampaignInvitePanelProps) {
  const [activeTab, setActiveTab] = useState<'direct' | 'tokens'>('direct');
  const [username, setUsername] = useState('');
  const [maxUses, setMaxUses] = useState(1);
  const [invitations, setInvitations] = useState<CampaignInvitation[]>([]);
  const [tokens, setTokens] = useState<CampaignInviteToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);

  // Load invitations and tokens
  useEffect(() => {
    loadData();
  }, [campaignId]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      const [invs, toks] = await Promise.all([
        campaignService.getCampaignInvitations(campaignId),
        campaignService.getInviteTokens(campaignId),
      ]);
      setInvitations(invs);
      setTokens(toks);
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to load invitations');
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleInviteUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || isLoading) return;

    setIsLoading(true);
    try {
      await campaignService.inviteUser(campaignId, username.trim());
      onSuccess?.(`Invitation sent to ${username}`);
      setUsername('');
      await loadData();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await campaignService.revokeInvitation(invitationId);
      onSuccess?.('Invitation revoked');
      await loadData();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to revoke invitation');
    }
  };

  const handleCreateToken = async () => {
    setIsLoading(true);
    try {
      await campaignService.createInviteToken(campaignId, maxUses);
      onSuccess?.('Invite link created');
      await loadData();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to create invite link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    try {
      await campaignService.revokeInviteToken(tokenId);
      onSuccess?.('Invite link revoked');
      await loadData();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Failed to revoke invite link');
    }
  };

  const handleCopyToken = (token: string) => {
    const inviteUrl = `${window.location.origin}/campaigns/join/${token}`;
    navigator.clipboard.writeText(inviteUrl).then(() => {
      onSuccess?.('Link copied to clipboard');
    }).catch(() => {
      onError?.('Failed to copy link');
    });
  };

  if (isLoadingData) {
    return <div className="invite-panel">Loading...</div>;
  }

  return (
    <div className="invite-panel">
      <div className="tabs">
        <button
          className={`tab ${activeTab === 'direct' ? 'active' : ''}`}
          onClick={() => setActiveTab('direct')}
        >
          Direct Invites
        </button>
        <button
          className={`tab ${activeTab === 'tokens' ? 'active' : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Invite Links
        </button>
      </div>

      {activeTab === 'direct' && (
        <div className="tab-content">
          <form onSubmit={handleInviteUser} className="invite-form">
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              maxLength={20}
              disabled={isLoading}
              className="username-input"
            />
            <button type="submit" disabled={!username.trim() || isLoading} className="invite-button">
              {isLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>

          <div className="invitations-list">
            <h3>Pending Invitations</h3>
            {invitations.length === 0 ? (
              <p className="empty-message">No pending invitations</p>
            ) : (
              invitations.map((inv) => (
                <div key={inv.id} className="invitation-item">
                  <div className="invitation-info">
                    <span className="username">{inv.invitedUsername}</span>
                    <span className="date">
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    className="revoke-button"
                  >
                    Revoke
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className="tab-content">
          <div className="create-token-form">
            <label>
              Max uses:
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                min={1}
                max={100}
                disabled={isLoading}
                className="max-uses-input"
              />
            </label>
            <button onClick={handleCreateToken} disabled={isLoading} className="create-token-button">
              {isLoading ? 'Creating...' : 'Create Invite Link'}
            </button>
          </div>

          <div className="tokens-list">
            <h3>Active Invite Links</h3>
            {tokens.length === 0 ? (
              <p className="empty-message">No active invite links</p>
            ) : (
              tokens.map((token) => (
                <div key={token.id} className="token-item">
                  <div className="token-info">
                    <span className="token-uses">
                      {token.usedCount} / {token.maxUses} uses
                    </span>
                    <span className="token-expires">
                      Expires: {new Date(token.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="token-actions">
                    <button
                      onClick={() => handleCopyToken(token.token)}
                      className="copy-button"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleRevokeToken(token.id)}
                      className="revoke-button"
                    >
                      Revoke
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        .invite-panel {
          width: 100%;
          max-width: 600px;
          background: white;
          border-radius: 8px;
          padding: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .tabs {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          border-bottom: 2px solid #e0e0e0;
        }

        .tab {
          padding: 12px 24px;
          background: none;
          border: none;
          border-bottom: 3px solid transparent;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab.active {
          color: #4a90e2;
          border-bottom-color: #4a90e2;
        }

        .tab:hover:not(.active) {
          color: #333;
        }

        .tab-content {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .invite-form {
          display: flex;
          gap: 12px;
        }

        .username-input {
          flex: 1;
          padding: 12px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 6px;
          transition: border-color 0.2s;
        }

        .username-input:focus {
          outline: none;
          border-color: #4a90e2;
        }

        .username-input:disabled {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .invite-button,
        .create-token-button {
          padding: 12px 24px;
          background-color: #4a90e2;
          color: white;
          border: none;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .invite-button:hover:not(:disabled),
        .create-token-button:hover:not(:disabled) {
          background-color: #357abd;
        }

        .invite-button:disabled,
        .create-token-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .invitations-list,
        .tokens-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .invitations-list h3,
        .tokens-list h3 {
          margin: 0 0 12px 0;
          font-size: 18px;
          color: #333;
        }

        .empty-message {
          color: #999;
          font-style: italic;
          text-align: center;
          padding: 24px;
        }

        .invitation-item,
        .token-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background-color: #f9f9f9;
          border-radius: 6px;
          border: 1px solid #e0e0e0;
        }

        .invitation-info,
        .token-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .username {
          font-weight: 600;
          color: #333;
        }

        .date,
        .token-uses,
        .token-expires {
          font-size: 14px;
          color: #666;
        }

        .token-actions {
          display: flex;
          gap: 8px;
        }

        .copy-button,
        .revoke-button {
          padding: 8px 16px;
          border: none;
          border-radius: 4px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .copy-button {
          background-color: #2ecc71;
          color: white;
        }

        .copy-button:hover {
          background-color: #27ae60;
        }

        .revoke-button {
          background-color: #e74c3c;
          color: white;
        }

        .revoke-button:hover {
          background-color: #c0392b;
        }

        .create-token-form {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .create-token-form label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 16px;
          color: #333;
        }

        .max-uses-input {
          width: 80px;
          padding: 8px 12px;
          font-size: 16px;
          border: 2px solid #ddd;
          border-radius: 6px;
          text-align: center;
        }

        .max-uses-input:focus {
          outline: none;
          border-color: #4a90e2;
        }

        @media (max-width: 768px) {
          .invite-panel {
            padding: 16px;
          }

          .invite-form {
            flex-direction: column;
          }

          .invitation-item,
          .token-item {
            flex-direction: column;
            align-items: stretch;
            gap: 12px;
          }

          .token-actions {
            justify-content: stretch;
          }

          .copy-button,
          .revoke-button {
            flex: 1;
          }

          .create-token-form {
            flex-direction: column;
            align-items: stretch;
          }
        }
      `}</style>
    </div>
  );
}
