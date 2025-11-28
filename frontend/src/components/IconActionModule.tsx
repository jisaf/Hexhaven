import React, { useEffect, useState } from 'react';
import type { IconActionModule as IconActionModuleProps } from '../../../shared/types';
import styles from './IconActionModule.module.css';

const IconActionModule: React.FC<IconActionModuleProps> = ({ action, value, range, target, bonuses }) => {
  const [iconSrc, setIconSrc] = useState('');

  useEffect(() => {
    const importIcon = async () => {
      try {
        const iconModule = await import(`../assets/icons/${action}.svg`);
        setIconSrc(iconModule.default);
      } catch (error) {
        console.error(`Failed to load icon: ${action}`, error);
        // Optionally set a fallback icon here
      }
    };

    importIcon();
  }, [action]);

  return (
    <div className={styles.iconActionModule}>
      <div className={styles.mainAction}>
        {iconSrc ? (
          <img src={iconSrc} alt={`${action} icon`} className={styles.icon} />
        ) : (
          <span className={styles.icon}>{action.charAt(0).toUpperCase()}</span>
        )}
        <span className={styles.value}>{value}</span>
      </div>
      <div className={styles.bonuses}>
        {bonuses?.map((bonus, index) => (
          <span key={index} className={styles.bonus}>
            {bonus.type} {bonus.value && ` ${bonus.value}`}
          </span>
        ))}
        {range !== undefined && <span className={styles.range}>R{range}</span>}
        {target !== undefined && <span className={styles.target}>T{target}</span>}
      </div>
    </div>
  );
};

export default IconActionModule;
