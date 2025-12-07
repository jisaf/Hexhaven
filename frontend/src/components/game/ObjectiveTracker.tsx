/**
 * ObjectiveTracker Component
 *
 * Collapsible panel displaying scenario objectives with real-time progress tracking.
 * Shows a compact progress bar by default, expands to show full details on click.
 */

import React, { useState } from 'react';
import type { ObjectivesLoadedPayload, ObjectiveProgressUpdatePayload } from '../../../../shared/types/events';
import styles from './ObjectiveTracker.module.css';

interface ObjectiveTrackerProps {
  objectives: ObjectivesLoadedPayload | null;
  progress: Map<string, ObjectiveProgressUpdatePayload>;
}

interface ProgressBarProps {
  progress: ObjectiveProgressUpdatePayload;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ progress }) => {
  const percentage = Math.min(100, Math.max(0, progress.percentage));

  return (
    <div className={styles.progressBarContainer}>
      <div className={styles.progressBar}>
        <div
          className={styles.progressFill}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className={styles.progressText}>
        {progress.current}/{progress.target}
      </div>
    </div>
  );
};

export const ObjectiveTracker: React.FC<ObjectiveTrackerProps> = ({ objectives, progress }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!objectives) return null;

  const primaryProgress = progress.get(objectives.primary.id);
  const primaryPercentage = primaryProgress ? Math.min(100, Math.max(0, primaryProgress.percentage)) : 0;

  // Debug logging
  console.log('[ObjectiveTracker] Render:', {
    objectiveId: objectives.primary.id,
    progressMapSize: progress.size,
    primaryProgress: primaryProgress ? `${primaryProgress.current}/${primaryProgress.target} (${primaryProgress.percentage}%)` : 'none',
    allProgressKeys: Array.from(progress.keys()),
  });

  // Compact view - just a progress indicator button
  if (!isExpanded) {
    return (
      <button
        className={styles.objectiveButton}
        onClick={() => setIsExpanded(true)}
        title="Click to view objectives"
        aria-label="View objectives"
      >
        <div className={styles.compactProgress}>
          <div
            className={styles.compactProgressFill}
            style={{ width: `${primaryPercentage}%` }}
          />
        </div>
        <span className={styles.compactLabel}>Objectives</span>
        <span className={styles.compactPercentage}>{Math.round(primaryPercentage)}%</span>
      </button>
    );
  }

  // Expanded view - full objectives panel
  return (
    <div className={styles.objectivePanel}>
      <div className={styles.panelHeader}>
        <h3 className={styles.panelTitle}>Mission Objectives</h3>
        <button
          className={styles.collapseButton}
          onClick={() => setIsExpanded(false)}
          aria-label="Collapse objectives"
        >
          ✕
        </button>
      </div>

      <div className={styles.objectivesList}>
        {/* Primary objective */}
        <div className={styles.primaryObjective}>
          <div className={styles.objectiveHeader}>
            <span className={styles.objectiveLabel}>Primary:</span>
            <span className={styles.objectiveText}>{objectives.primary.description}</span>
          </div>
          {objectives.primary.trackProgress && primaryProgress && (
            <ProgressBar progress={primaryProgress} />
          )}
        </div>

        {/* Secondary objectives */}
        {objectives.secondary && objectives.secondary.length > 0 && (
          <div className={styles.secondaryObjectives}>
            {objectives.secondary.map((obj) => {
              const objProgress = progress.get(obj.id);

              return (
                <div key={obj.id} className={styles.secondaryObjective}>
                  <div className={styles.objectiveHeader}>
                    <span className={styles.objectiveLabel}>Optional:</span>
                    <span className={styles.objectiveText}>{obj.description}</span>
                  </div>
                  {obj.trackProgress && objProgress && (
                    <ProgressBar progress={objProgress} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Failure conditions */}
        {objectives.failureConditions && objectives.failureConditions.length > 0 && (
          <div className={styles.failureConditions}>
            <div className={styles.failureHeader}>
              <span className={styles.failureLabel}>⚠️ Avoid:</span>
            </div>
            {objectives.failureConditions.map((fc) => (
              <div key={fc.id} className={styles.failureCondition}>
                <span className={styles.failureText}>{fc.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
