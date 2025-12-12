import React from 'react';

interface CardProps {
  children: React.ReactNode;
  sidebarContent: React.ReactNode;
  isSelected?: boolean;
  disabled?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, sidebarContent, isSelected, disabled }) => {
  const borderClass = isSelected ? 'border-green-500' : 'border-slate-600';
  const disabledClass = disabled ? 'opacity-50 cursor-not-allowed' : '';

  return (
    <div
      className={`bg-slate-800 rounded-2xl border-2 w-full transition-all duration-200 ${borderClass} ${disabledClass}`}
      style={{ aspectRatio: '2.5 / 3.5' }}
    >
      <div className="flex h-full">
        {/* Main Content Area */}
        <div className="w-[90%] h-full grid grid-rows-9">
          {children}
        </div>
        {/* Sidebar */}
        <div className="w-[10%] h-full border-l-2 border-slate-600">
          {sidebarContent}
        </div>
      </div>
    </div>
  );
};
