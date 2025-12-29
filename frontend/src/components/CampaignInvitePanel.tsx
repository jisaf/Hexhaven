/**
 * CampaignInvitePanel Component
 *
 * Allows campaign hosts to:
 * - Invite users by username
 * - View and manage pending invitations
 * - Create and manage shareable invite tokens
 */

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { campaignService, type CampaignInvitation, type CampaignInviteToken } from '../services/campaign.service';
import { extractErrorMessage } from '../utils/error';
import styles from './CampaignInvitePanel.module.css';

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
  const [revokingInvitationId, setRevokingInvitationId] = useState<string | null>(null);
  const [revokingTokenId, setRevokingTokenId] = useState<string | null>(null);

  // Load invitations and tokens
  const loadData = useCallback(async () => {
    setIsLoadingData(true);
    try {
      const results = await Promise.allSettled([
        campaignService.getCampaignInvitations(campaignId),
        campaignService.getInviteTokens(campaignId),
      ]);

      // Handle invitations result
      if (results[0].status === 'fulfilled') {
        setInvitations(results[0].value);
      } else {
        onError?.(extractErrorMessage(results[0].reason, 'Failed to load invitations'));
      }

      // Handle tokens result
      if (results[1].status === 'fulfilled') {
        setTokens(results[1].value);
      } else {
        onError?.(extractErrorMessage(results[1].reason, 'Failed to load invite tokens'));
      }
    } finally {
      setIsLoadingData(false);
    }
  }, [campaignId, onError]);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setIsLoadingData(true);
      try {
        const results = await Promise.allSettled([
          campaignService.getCampaignInvitations(campaignId),
          campaignService.getInviteTokens(campaignId),
        ]);

        if (!isMounted) return;

        // Handle invitations result
        if (results[0].status === 'fulfilled') {
          setInvitations(results[0].value);
        } else {
          onError?.(extractErrorMessage(results[0].reason, 'Failed to load invitations'));
        }

        // Handle tokens result
        if (results[1].status === 'fulfilled') {
          setTokens(results[1].value);
        } else {
          onError?.(extractErrorMessage(results[1].reason, 'Failed to load invite tokens'));
        }
      } finally {
        if (isMounted) {
          setIsLoadingData(false);
        }
      }
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [campaignId, onError]);

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
      onError?.(extractErrorMessage(error, 'Failed to send invitation'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    if (revokingInvitationId) return;

    setRevokingInvitationId(invitationId);
    try {
      await campaignService.revokeInvitation(campaignId, invitationId);
      onSuccess?.('Invitation revoked');
      await loadData();
    } catch (error) {
      onError?.(extractErrorMessage(error, 'Failed to revoke invitation'));
    } finally {
      setRevokingInvitationId(null);
    }
  };

  const handleCreateToken = async () => {
    setIsLoading(true);
    try {
      await campaignService.createInviteToken(campaignId, maxUses);
      onSuccess?.('Invite link created');
      await loadData();
    } catch (error) {
      onError?.(extractErrorMessage(error, 'Failed to create invite link'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevokeToken = async (tokenId: string) => {
    if (revokingTokenId) return;

    setRevokingTokenId(tokenId);
    try {
      await campaignService.revokeInviteToken(campaignId, tokenId);
      onSuccess?.('Invite link revoked');
      await loadData();
    } catch (error) {
      onError?.(extractErrorMessage(error, 'Failed to revoke invite link'));
    } finally {
      setRevokingTokenId(null);
    }
  };

  const handleCopyToken = async (token: string) => {
    const inviteUrl = `${window.location.origin}/campaigns/join/${token}`;

    if (!navigator.clipboard) {
      onError?.('Clipboard not supported in this browser');
      return;
    }

    try {
      await navigator.clipboard.writeText(inviteUrl);
      onSuccess?.('Link copied to clipboard');
    } catch {
      onError?.('Failed to copy link');
    }
  };

  if (isLoadingData) {
    return <div className={styles['invite-panel']}>Loading...</div>;
  }

  return (
    <div className={styles['invite-panel']}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === 'direct' ? styles.active : ''}`}
          onClick={() => setActiveTab('direct')}
        >
          Direct Invites
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'tokens' ? styles.active : ''}`}
          onClick={() => setActiveTab('tokens')}
        >
          Invite Links
        </button>
      </div>

      {activeTab === 'direct' && (
        <div className={styles['tab-content']}>
          <form onSubmit={handleInviteUser} className={styles['invite-form']}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              maxLength={20}
              disabled={isLoading}
              className={styles['username-input']}
            />
            <button type="submit" disabled={!username.trim() || isLoading} className={styles['invite-button']}>
              {isLoading ? 'Sending...' : 'Send Invite'}
            </button>
          </form>

          <div className={styles['invitations-list']}>
            <h3>Pending Invitations</h3>
            {invitations.length === 0 ? (
              <p className={styles['empty-message']}>No pending invitations</p>
            ) : (
              invitations.map((inv) => (
                <div key={inv.id} className={styles['invitation-item']}>
                  <div className={styles['invitation-info']}>
                    <span className={styles.username}>{inv.invitedUsername}</span>
                    <span className={styles.date}>
                      {new Date(inv.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <button
                    onClick={() => handleRevokeInvitation(inv.id)}
                    disabled={revokingInvitationId === inv.id}
                    className={styles['revoke-button']}
                  >
                    {revokingInvitationId === inv.id ? 'Revoking...' : 'Revoke'}
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'tokens' && (
        <div className={styles['tab-content']}>
          <div className={styles['create-token-form']}>
            <label>
              Max uses:
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                min={1}
                max={100}
                disabled={isLoading}
                className={styles['max-uses-input']}
              />
            </label>
            <button onClick={handleCreateToken} disabled={isLoading} className={styles['create-token-button']}>
              {isLoading ? 'Creating...' : 'Create Invite Link'}
            </button>
          </div>

          <div className={styles['tokens-list']}>
            <h3>Active Invite Links</h3>
            {tokens.length === 0 ? (
              <p className={styles['empty-message']}>No active invite links</p>
            ) : (
              tokens.map((token) => (
                <div key={token.id} className={styles['token-item']}>
                  <div className={styles['token-info']}>
                    <span className={styles['token-uses']}>
                      {token.usedCount} / {token.maxUses} uses
                    </span>
                    <span className={styles['token-expires']}>
                      Expires: {new Date(token.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className={styles['token-actions']}>
                    <button
                      onClick={() => handleCopyToken(token.token)}
                      className={styles['copy-button']}
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => handleRevokeToken(token.id)}
                      disabled={revokingTokenId === token.id}
                      className={styles['revoke-button']}
                    >
                      {revokingTokenId === token.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
