import React from 'react';
import { Ability, AbilityCard, CardModule, IconActionModule, ModuleType, SummonModule, TextModule, HexTargetModule } from '../../../shared/types';
import IconActionModuleComponent from './IconActionModule';
import TextModuleComponent from './TextModule';
import SummonModuleComponent from './SummonModule';
import HexTargetModuleComponent from './HexTargetModule';
import styles from './ModularAbilityCard.module.css';

interface ModularAbilityCardProps {
  card: AbilityCard;
  onClick: () => void;
  isSelected: boolean;
  isTop?: boolean;
  disabled: boolean;
}

const renderModule = (module: CardModule) => {
  switch (module.type) {
    case ModuleType.ICON_ACTION:
      return <IconActionModuleComponent {...(module as IconActionModule)} />;
    case ModuleType.TEXT:
      return <TextModuleComponent {...(module as TextModule)} />;
    case ModuleType.SUMMON:
      return <SummonModuleComponent {...(module as SummonModule)} />;
    case ModuleType.HEX_TARGET:
      return <HexTargetModuleComponent {...(module as HexTargetModule)} />;
    default:
      return null;
  }
};

const renderAbility = (ability: Ability) => {
  return (
    <div className={styles.abilityContent}>
      {ability.rows.map((row, rowIndex) => (
        <div key={rowIndex} className={styles[`row${rowIndex + 1}`]}>
          {row.modules.map((module, moduleIndex) => (
            <div key={moduleIndex}>{renderModule(module)}</div>
          ))}
        </div>
      ))}
    </div>
  );
};

const ModularAbilityCard: React.FC<ModularAbilityCardProps> = ({ card, onClick, isSelected, isTop, disabled }) => {
  const cardClasses = [
    styles.card,
    isSelected ? styles.selected : '',
    disabled ? styles.disabled : '',
  ].join(' ');

  return (
    <div className={cardClasses} onClick={!disabled ? onClick : undefined}>
      {isSelected && (
        <div className={isTop ? styles.topIndicator : styles.bottomIndicator}>
          {isTop ? 'TOP' : 'BOTTOM'}
        </div>
      )}
      <div className={styles.initiative}>{card.initiative}</div>
      <div className={styles.actions}>
        <div className={styles.topAction}>
          {renderAbility(card.topAction)}
          <div className={styles.meta}>
            {card.topAction.isLoss && <div className={styles.lossIcon}>X</div>}
            {card.topAction.xp && <div className={styles.xpIcon}>{card.topAction.xp}</div>}
            {/* Element infusions will be added in a future step */}
          </div>
        </div>
        <div className={styles.bottomAction}>
          {renderAbility(card.bottomAction)}
          <div className={styles.meta}>
            {card.bottomAction.isLoss && <div className={styles.lossIcon}>X</div>}
            {card.bottomAction.xp && <div className={styles.xpIcon}>{card.bottomAction.xp}</div>}
            {/* Element infusions will be added in a future step */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModularAbilityCard;
