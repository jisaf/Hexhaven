/**
 * Narrative Overlay Component
 *
 * Main container for displaying narrative content.
 * Renders either a full-screen story page or a modal popup
 * depending on the narrative type.
 */

import React from 'react';
import type { NarrativeDisplayPayload } from '../../../../shared/types/events';
import type { NarrativeAcknowledgmentState } from '../../hooks/useNarrative';
import { NarrativeStoryPage } from './NarrativeStoryPage';
import { NarrativePopup } from './NarrativePopup';
import './NarrativeOverlay.css';

export interface NarrativeOverlayProps {
  narrative: NarrativeDisplayPayload;
  acknowledgments: NarrativeAcknowledgmentState[];
  myPlayerId: string | null;
  myAcknowledgment: boolean;
  onAcknowledge: () => void;
}

export const NarrativeOverlay: React.FC<NarrativeOverlayProps> = ({
  narrative,
  acknowledgments,
  myPlayerId,
  myAcknowledgment,
  onAcknowledge,
}) => {
  // Use full-screen story page for intro, victory, and defeat
  // Use popup modal for mid-scenario triggers
  const isFullScreen =
    narrative.type === 'intro' ||
    narrative.type === 'victory' ||
    narrative.type === 'defeat';

  if (isFullScreen) {
    return (
      <NarrativeStoryPage
        type={narrative.type}
        content={narrative.content}
        acknowledgments={acknowledgments}
        myPlayerId={myPlayerId}
        myAcknowledgment={myAcknowledgment}
        onAcknowledge={onAcknowledge}
      />
    );
  }

  // Trigger narratives use popup
  return (
    <NarrativePopup
      content={narrative.content}
      rewards={narrative.rewards}
      gameEffects={narrative.gameEffects}
      acknowledgments={acknowledgments}
      myPlayerId={myPlayerId}
      myAcknowledgment={myAcknowledgment}
      onAcknowledge={onAcknowledge}
    />
  );
};

export default NarrativeOverlay;
