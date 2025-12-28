/**
 * Icon Reference Page
 *
 * Displays all game icons with their names and descriptions.
 * Useful for players to learn what each icon means during gameplay.
 */

import { useTranslation } from 'react-i18next';
import {
  ACTION_ICONS,
  ELEMENT_ICONS,
  CARD_ICONS,
  EFFECT_ICONS,
  type EffectIcon,
} from '../components/layouts/effectIcons';
import styles from './IconReferencePage.module.css';

// Icon descriptions for gameplay context
const ICON_DESCRIPTIONS: Record<string, string> = {
  // Actions
  move: 'Move your character a number of hexes on the board',
  attack: 'Perform a melee or ranged attack against enemies',
  heal: 'Restore health points to yourself or allies',
  loot: 'Pick up coins and treasure from the ground',
  special: 'Perform a unique character ability',
  summon: 'Create a summoned ally to fight alongside you',
  text: 'Read the card text for special rules',

  // Elements
  fire: 'Fire element - infuse to create or consume to power abilities',
  ice: 'Ice element - infuse to create or consume to power abilities',
  air: 'Air element - infuse to create or consume to power abilities',
  earth: 'Earth element - infuse to create or consume to power abilities',
  light: 'Light element - infuse to create or consume to power abilities',
  dark: 'Dark element - infuse to create or consume to power abilities',

  // Card indicators
  loss: 'This card is permanently lost after use',
  persistent: 'Effect remains active until you dismiss it',
  xp: 'Gain experience points when this ability is used',

  // Status effects
  stun: 'Target loses their next turn and cannot act',
  poison: 'Target takes 1 damage at the start of each turn',
  wound: 'Target takes 1 damage at the start of each turn and cannot heal',
  muddle: 'Target draws disadvantage on all attacks',
  immobilize: 'Target cannot perform any move actions',
  disarm: 'Target cannot perform any attack actions',
  invisible: 'Character cannot be targeted by enemies',
  strengthen: 'Character draws advantage on all attacks',
  bless: 'Add a 2x damage card to your attack modifier deck',
  curse: 'Add a null (0 damage) card to attack modifier deck',

  // Movement effects
  push: 'Force target to move away from you',
  pull: 'Force target to move toward you',
  jump: 'Ignore all terrain and figures during movement',

  // Defense effects
  shield: 'Reduce incoming damage by the shield value',
  retaliate: 'Deal damage back to attackers in range',

  // Targeting
  'all adjacent': 'Target all enemies in adjacent hexes',
  'target all': 'Target all enemies in range',
  'target 2': 'Attack can target two different enemies',
  ally: 'This ability targets or affects allies',
  self: 'This ability targets yourself',

  // Special
  recover: 'Return lost or discarded cards to your hand',
  control: 'Take control of an enemy figure',
  augment: 'Enhance your abilities with additional effects',

  // Terrain
  obstacle: 'Create or interact with blocking terrain',
  trap: 'Create or trigger a damaging trap',
  'through obstacles': 'Move through obstacles and other figures',
};

// Define icon categories for organized display
const ICON_CATEGORIES = [
  { key: 'actions', label: 'Actions', icons: ACTION_ICONS },
  { key: 'elements', label: 'Elements', icons: ELEMENT_ICONS },
  { key: 'cardIndicators', label: 'Card Indicators', icons: CARD_ICONS },
  { key: 'effects', label: 'Effects', icons: EFFECT_ICONS },
] as const;

interface IconCardProps {
  iconKey: string;
  icon: EffectIcon;
}

const IconCard: React.FC<IconCardProps> = ({ iconKey, icon }) => {
  const { t } = useTranslation('common');
  const description =
    ICON_DESCRIPTIONS[iconKey] ||
    t(`iconReference.icons.${iconKey}.description`, 'See rulebook for details');

  return (
    <div className={styles.iconCard}>
      <div className={styles.iconDisplay}>
        <i
          className={`ra ${icon.icon}`}
          style={{ color: icon.color }}
          aria-hidden="true"
        />
      </div>
      <div className={styles.iconInfo}>
        <h3 className={styles.iconName}>{icon.label}</h3>
        <p className={styles.iconDescription}>{description}</p>
      </div>
    </div>
  );
};

export const IconReferencePage: React.FC = () => {
  const { t } = useTranslation('common');

  return (
    <div className={styles.iconReferencePage}>
      <div className={styles.header}>
        <h1>{t('iconReference.title', 'Icon Reference')}</h1>
        <p className={styles.subtitle}>
          {t(
            'iconReference.subtitle',
            'Learn what each icon means during gameplay'
          )}
        </p>
      </div>

      <div className={styles.categoriesContainer}>
        {ICON_CATEGORIES.map(({ key, label, icons }) => (
          <section key={key} className={styles.category}>
            <h2 className={styles.categoryTitle}>
              {t(`iconReference.categories.${key}`, label)}
            </h2>
            <div className={styles.iconsGrid}>
              {Object.entries(icons).map(([iconKey, icon]) => (
                <IconCard key={iconKey} iconKey={iconKey} icon={icon} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default IconReferencePage;
