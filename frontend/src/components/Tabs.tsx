/**
 * Tabs Component
 *
 * Renders a tabbed interface.
 */

import { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: number;
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export function Tabs({ tabs, defaultTab = 0, activeTab: controlledTab, onTabChange }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab);
  const activeTab = controlledTab ?? internalTab;

  const handleTabClick = (index: number) => {
    if (onTabChange) {
      onTabChange(index);
    } else {
      setInternalTab(index);
    }
  };

  return (
    <div className={styles.tabs}>
      <div className={styles.tabHeaders}>
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`${styles.tabHeader} ${activeTab === index ? styles.active : ''}`}
            onClick={() => handleTabClick(index)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabContent}>
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
}
