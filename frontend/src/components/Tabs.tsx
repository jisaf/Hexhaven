/**
 * Tabs Component
 *
 * A reusable component for creating tabbed navigation interfaces.
 */
import { useState } from 'react';
import styles from './Tabs.module.css';

interface Tab {
  label: string;
  content: React.ReactNode;
  disabled?: boolean;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: number;
}

export function Tabs({ tabs, defaultTab = 0 }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabClick = (index: number) => {
    if (!tabs[index].disabled) {
      setActiveTab(index);
    }
  };

  return (
    <div className={styles.tabsContainer}>
      <div className={styles.tabList} role="tablist">
        {tabs.map((tab, index) => (
          <button
            key={index}
            className={`${styles.tab} ${index === activeTab ? styles.active : ''}`}
            onClick={() => handleTabClick(index)}
            role="tab"
            aria-selected={index === activeTab}
            disabled={tab.disabled}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={styles.tabPanel} role="tabpanel">
        {tabs[activeTab]?.content}
      </div>
    </div>
  );
}
