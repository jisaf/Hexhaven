/**
 * MonsterList Component
 *
 * Displays a grid of monsters for a scenario, with a click-to-view details modal.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { MonsterGroup } from '../../../../shared/types/entities';
import styles from './MonsterList.module.css';

// Dynamically import all monster SVGs
const monsterImages: Record<string, string> = import.meta.globEager('../../assets/monsters/*.svg');

const getMonsterImagePath = (monsterType: string) => {
  const key = `../../assets/monsters/${monsterType.toLowerCase().replace(/ /g, '-')}.svg`;
  return monsterImages[key]?.default || '';
};

interface MonsterListProps {
  monsterGroups: MonsterGroup[];
}

export function MonsterList({ monsterGroups }: MonsterListProps) {
  const { t } = useTranslation('lobby');
  const [selectedMonster, setSelectedMonster] = useState<MonsterGroup | null>(null);

  const handleMonsterClick = (monster: MonsterGroup) => {
    setSelectedMonster(monster);
  };

  const handleCloseModal = () => {
    setSelectedMonster(null);
  };

  if (!monsterGroups || monsterGroups.length === 0) {
    return <p className={styles.noMonsters}>{t('scenario.noMonsters', 'No monsters in this scenario.')}</p>;
  }

  return (
    <div className={styles.monsterList} data-testid="monster-list">
      <div className={styles.monsterGrid}>
        {monsterGroups.map((monster, index) => (
          <div key={index} className={styles.monsterItem} onClick={() => handleMonsterClick(monster)}>
            <img
              src={getMonsterImagePath(monster.type)}
              alt={monster.type}
              className={styles.monsterImage}
            />
            <span className={styles.monsterName}>{monster.type} x {monster.count}</span>
          </div>
        ))}
      </div>

      {selectedMonster && (
        <div className={styles.modalBackdrop} onClick={handleCloseModal}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeButton} onClick={handleCloseModal}>&times;</button>
            <h4 className={styles.modalTitle}>{selectedMonster.type}</h4>
            <div className={styles.modalBody}>
              <img
                src={getMonsterImagePath(selectedMonster.type)}
                alt={selectedMonster.type}
                className={styles.modalImage}
              />
              <ul className={styles.statsList}>
                <li><strong>{t('common.health', 'Health')}:</strong> {selectedMonster.stats.health}</li>
                <li><strong>{t('common.movement', 'Movement')}:</strong> {selectedMonster.stats.movement}</li>
                <li><strong>{t('common.attack', 'Attack')}:</strong> {selectedMonster.stats.attack}</li>
                <li><strong>{t('common.range', 'Range')}:</strong> {selectedMonster.stats.range}</li>
                {selectedMonster.stats.specialAbilities.length > 0 && (
                  <li>
                    <strong>{t('common.abilities', 'Abilities')}:</strong>
                    <ul className={styles.abilitiesList}>
                      {selectedMonster.stats.specialAbilities.map((ability, i) => <li key={i}>{ability}</li>)}
                    </ul>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
