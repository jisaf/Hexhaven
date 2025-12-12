import React from 'react';

interface RowModuleProps {
  children: React.ReactNode;
  className?: string;
}

export const RowModule: React.FC<RowModuleProps> = ({ children, className = '' }) => {
  return (
    <div className={`flex items-center justify-center p-1 ${className}`}>
      {children}
    </div>
  );
};
