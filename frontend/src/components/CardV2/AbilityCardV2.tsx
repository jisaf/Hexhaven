import React from 'react';
import type { AbilityCard as AbilityCardType, Action, EnhancedAbilityCard } from '../../../../shared/types/entities';
import { Card } from './Card';
import { RowModule } from './RowModule';
import { TextBoxModule } from './TextBoxModule';

interface AbilityCardV2Props {
  card: AbilityCardType;
  isSelected?: boolean;
  isTop?: boolean;
  disabled?: boolean;
}

const renderActionDetails = (action: Action) => {
  return (
    <div className="text-center">
      <div className="text-xl font-bold capitalize">{action.type} {action.value}</div>
      {action.range && <div className="text-sm">Range {action.range}</div>}
      {action.effects && (
        <div className="text-xs italic text-slate-400 mt-1">
          {action.effects.join(', ')}
        </div>
      )}
      <div className="flex justify-center mt-2 space-x-2">
        {action.elementGenerate && (
          <div className="text-xs bg-green-800 px-2 py-1 rounded">
            Generate {action.elementGenerate}
          </div>
        )}
        {action.elementConsume && (
          <div className="text-xs bg-red-800 px-2 py-1 rounded">
            Consume {action.elementConsume}
          </div>
        )}
      </div>
    </div>
  );
};

export const AbilityCardV2: React.FC<AbilityCardV2Props> = ({ card, isSelected, isTop, disabled }) => {
  const { name, initiative, level, topAction, bottomAction } = card;
  const isLost = (card as EnhancedAbilityCard).isLost;

  const topClasses = isTop === true ? 'ring-2 ring-green-500' : '';
  const bottomClasses = isTop === false ? 'ring-2 ring-green-500' : '';

  return (
    <Card
      topContent={
        <div className={`h-full ${topClasses}`}>
          <RowModule className="text-lg font-bold text-slate-100">{name}</RowModule>
          <TextBoxModule rows={3}>
            {renderActionDetails(topAction)}
          </TextBoxModule>
        </div>
      }
      bottomContent={
        <div className={`h-full ${bottomClasses}`}>
          <TextBoxModule rows={3}>
            {renderActionDetails(bottomAction)}
          </TextBoxModule>
          <RowModule className="text-sm text-slate-400">Level {level}</RowModule>
        </div>
      }
      sidebarContent={
        <div className="flex flex-col items-center justify-between h-full py-4 text-amber-400">
          <div className="text-3xl font-bold">{initiative}</div>
          {isLost && (
            <div className="text-red-500 font-bold text-xs">LOST</div>
          )}
        </div>
      }
      isSelected={isSelected}
      disabled={disabled}
    />
  );
};
