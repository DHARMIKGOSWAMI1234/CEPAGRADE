import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'rect' | 'circle';
  width?: string | number;
  height?: string | number;
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'rect',
  width,
  height,
  className = '',
  style,
  ...props
}) => {
  const variantStyles = {
    text: 'h-4 w-full rounded',
    rect: 'rounded-xl',
    circle: 'rounded-full',
  };

  const dynamicStyle = {
    width: width,
    height: height,
    ...style,
  };

  return (
    <div
      className={`animate-pulse bg-slate-200/80 dark:bg-slate-800 ${variantStyles[variant]} ${className}`}
      style={dynamicStyle}
      {...props}
    />
  );
};
