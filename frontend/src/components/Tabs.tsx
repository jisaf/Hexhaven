/**
 * Tabs Component
 *
 * A reusable component for creating tabbed navigation interfaces.
 * Can be used as a controlled or uncontrolled component.
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
  activeTab?: number;
  onTabChange?: (index: number) => void;
}

export function Tabs({ tabs, defaultTab = 0, activeTab: controlledTab, onTabChange }: TabsProps) {
  const [internalTab, setInternalTab] = useState(defaultTab);

  // If controlledTab is provided, it's a controlled component. Otherwise, use internal state.
  const activeTab = controlledTab ?? internalTab;

  const handleTabClick = (index: number) => {
    // Do nothing if the tab is disabled
    if (tabs[index].disabled) {
      return;
    }

    // If it's a controlled component, call the callback
    if (onTabChange) {
      onTabChange(index);
    } else {
      // Otherwise, update the internal state
      setInternalTab(index);
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
