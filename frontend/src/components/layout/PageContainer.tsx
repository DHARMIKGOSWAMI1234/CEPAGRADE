import React from 'react';

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'standard' | 'wide' | 'full';
}

export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  className = '',
  maxWidth = 'standard',
}) => {
  const maxWidthMap = {
    standard: 'max-w-7xl',
    wide: 'max-w-[1600px]',
    full: 'max-w-full',
  };

  return (
    <main className={`flex-1 p-4 sm:p-6 lg:p-8 mx-auto w-full ${maxWidthMap[maxWidth]} ${className}`}>
      {children}
    </main>
  );
};
