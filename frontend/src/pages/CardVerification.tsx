import React from 'react';
import { AbilityCard } from '../components/AbilityCard';
import type { AbilityCard as AbilityCardType } from '../../../shared/types/entities';
import { CharacterClass, ElementType } from '../../../shared/types/entities';

const mockCard: AbilityCardType = {
  id: 'BR-01',
  characterClass: CharacterClass.BRUTE,
  name: 'Sweeping Blow',
  level: 1,
  initiative: 64,
  topAction: {
    type: 'attack',
    value: 2,
    effects: ['Push 1'],
    elementGenerate: ElementType.AIR,
  },
  bottomAction: {
    type: 'move',
    value: 3,
    effects: ['Gain 1 XP'],
  },
};

const CardVerification: React.FC = () => {
  return (
    <div className="bg-gray-900 min-h-screen p-8 flex flex-wrap gap-8 items-center justify-center">
      <div className="w-64">
        <h2 className="text-white text-center mb-2">Default</h2>
        <AbilityCard card={mockCard} />
      </div>
      <div className="w-64">
        <h2 className="text-white text-center mb-2">Selected</h2>
        <AbilityCard card={mockCard} isSelected={true} />
      </div>
      <div className="w-64">
        <h2 className="text-white text-center mb-2">Disabled</h2>
        <AbilityCard card={mockCard} disabled={true} />
      </div>
      <div className="w-64">
        <h2 className="text-white text-center mb-2">Top Action</h2>
        <AbilityCard card={mockCard} isTop={true} />
      </div>
      <div className="w-64">
        <h2 className="text-white text-center mb-2">Bottom Action</h2>
        <AbilityCard card={mockCard} isTop={false} />
      </div>
    </div>
  );
};

export default CardVerification;
