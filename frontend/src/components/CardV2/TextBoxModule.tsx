import React from 'react';

interface TextBoxModuleProps {
  children: React.ReactNode;
  rows: 1 | 2 | 3 | 4;
  className?: string;
}

export const TextBoxModule: React.FC<TextBoxModuleProps> = ({ children, rows, className = '' }) => {
  const rowSpanClass = `row-span-${rows}`;
  return (
    <div className={`p-2 text-sm text-slate-300 ${rowSpanClass} ${className}`}>
      {children}
    </div>
  );
};
