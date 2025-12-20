/**
 * CampaignsList Component (Issue #244)
 *
 * Displays user's campaigns and available campaign templates.
 * Allows creating new campaigns and viewing existing ones.
 */

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { campaignService } from '../../services/campaign.service';
import type { CampaignListItem, CampaignTemplate, DeathMode } from '../../services/campaign.service';
import styles from './CampaignsList.module.css';

interface CampaignsListProps {
  onSelectCampaign: (campaignId: string) => void;
}

export function CampaignsList({ onSelectCampaign }: CampaignsListProps) {
  const { t } = useTranslation('lobby');
  const [campaigns, setCampaigns] = useState<CampaignListItem[]>([]);
  const [templates, setTemplates] = useState<CampaignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<CampaignTemplate | null>(null);
  const [customName, setCustomName] = useState('');
  const [deathMode, setDeathMode] = useState<DeathMode>('healing');
  const [creating, setCreating] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [campaignsData, templatesData] = await Promise.all([
        campaignService.getMyCampaigns(),
        campaignService.getTemplates(),
      ]);
      setCampaigns(campaignsData);
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load campaigns');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateCampaign = async () => {
    if (!selectedTemplate) return;

    try {
      setCreating(true);
      const campaign = await campaignService.createCampaign({
        templateId: selectedTemplate.id,
        name: customName || undefined,
        deathMode: selectedTemplate.deathMode === 'configurable' ? deathMode : undefined,
      });
      setShowCreateForm(false);
      setSelectedTemplate(null);
      setCustomName('');
      // Navigate to the new campaign
      onSelectCampaign(campaign.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create campaign');
    } finally {
      setCreating(false);
    }
  };

  const handleSelectTemplate = (template: CampaignTemplate) => {
    setSelectedTemplate(template);
    setCustomName(template.name);
    if (template.deathMode !== 'configurable') {
      setDeathMode(template.deathMode);
    }
    setShowCreateForm(true);
  };

  if (loading) {
    return (
      <div className={styles.campaignsList}>
        <div className={styles.loading}>Loading campaigns...</div>
      </div>
    );
  }

  return (
    <div className={styles.campaignsList}>
      <h2 className={styles.title}>{t('campaigns', 'Campaigns')}</h2>

      {error && (
        <div className={styles.error} role="alert">
          {error}
          <button onClick={() => setError(null)} className={styles.dismissError}>
            Dismiss
          </button>
        </div>
      )}

      {/* Existing Campaigns */}
      {campaigns.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('myCampaigns', 'My Campaigns')}</h3>
          <div className={styles.campaignsGrid}>
            {campaigns.map((campaign) => (
              <div
                key={campaign.id}
                className={`${styles.campaignCard} ${campaign.isCompleted ? styles.completed : ''}`}
                onClick={() => onSelectCampaign(campaign.id)}
              >
                <div className={styles.campaignHeader}>
                  <span className={styles.campaignName}>{campaign.name}</span>
                  <span className={styles.campaignStatus}>
                    {campaign.isCompleted
                      ? t('completed', 'Completed')
                      : t('inProgress', 'In Progress')}
                  </span>
                </div>
                <div className={styles.campaignInfo}>
                  <span className={styles.scenarioCount}>
                    {t('scenarios', 'Scenarios')}: {campaign.completedScenariosCount}/{campaign.totalScenariosCount}
                  </span>
                  <span className={styles.deathMode}>
                    {campaign.deathMode === 'healing'
                      ? t('healingMode', 'Healing')
                      : t('permadeathMode', 'Permadeath')}
                  </span>
                </div>
                <div className={styles.campaignStats}>
                  <span>Prosperity: {campaign.prosperityLevel}</span>
                  <span>Reputation: {campaign.reputation}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create New Campaign */}
      {!showCreateForm ? (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>{t('startNewCampaign', 'Start New Campaign')}</h3>
          {templates.length === 0 ? (
            <p className={styles.noTemplates}>No campaign templates available.</p>
          ) : (
            <div className={styles.templatesGrid}>
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={styles.templateCard}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className={styles.templateHeader}>
                    <span className={styles.templateName}>{template.name}</span>
                  </div>
                  <p className={styles.templateDescription}>{template.description}</p>
                  <div className={styles.templateInfo}>
                    <span>
                      {template.minPlayers}-{template.maxPlayers} players
                    </span>
                    <span>{template.scenarios.length} scenarios</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.createForm}>
          <h3 className={styles.sectionTitle}>
            {t('configureCampaign', 'Configure Campaign')}
          </h3>

          <div className={styles.formGroup}>
            <label className={styles.label}>Campaign Name</label>
            <input
              type="text"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className={styles.input}
              placeholder={selectedTemplate?.name}
            />
          </div>

          {selectedTemplate?.deathMode === 'configurable' && (
            <div className={styles.formGroup}>
              <label className={styles.label}>Death Mode</label>
              <div className={styles.deathModeOptions}>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="deathMode"
                    value="healing"
                    checked={deathMode === 'healing'}
                    onChange={() => setDeathMode('healing')}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Healing</span>
                    <span className={styles.radioDescription}>
                      All characters heal between scenarios. No permanent death.
                    </span>
                  </div>
                </label>
                <label className={styles.radioOption}>
                  <input
                    type="radio"
                    name="deathMode"
                    value="permadeath"
                    checked={deathMode === 'permadeath'}
                    onChange={() => setDeathMode('permadeath')}
                  />
                  <div className={styles.radioContent}>
                    <span className={styles.radioLabel}>Permadeath</span>
                    <span className={styles.radioDescription}>
                      Exhausted characters retire permanently. Non-exhausted heal.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          )}

          <div className={styles.formActions}>
            <button
              className={styles.cancelButton}
              onClick={() => {
                setShowCreateForm(false);
                setSelectedTemplate(null);
              }}
            >
              Cancel
            </button>
            <button
              className={styles.createButton}
              onClick={handleCreateCampaign}
              disabled={creating}
            >
              {creating ? 'Creating...' : 'Start Campaign'}
            </button>
          </div>
        </div>
      )}

      {campaigns.length === 0 && !showCreateForm && (
        <p className={styles.noCampaigns}>
          {t('noCampaigns', 'You have no campaigns yet. Select a template above to start one!')}
        </p>
      )}
    </div>
  );
}
