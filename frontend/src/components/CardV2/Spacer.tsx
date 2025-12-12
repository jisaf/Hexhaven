import React from 'react';

interface SpacerProps {
  count?: 1 | 2 | 3 | 4;
}

export const Spacer: React.FC<SpacerProps> = ({ count = 1 }) => {
  const rowSpanClass = `row-span-${count}`;
  return <div className={rowSpanClass} />;
};
