'use client';

import Colors from '@/lib/colors';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export default function LoadingSpinner({
  size = 'md',
  color,
  className = '',
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-6 h-6 border-2',
    md: 'w-10 h-10 border-3',
    lg: 'w-14 h-14 border-4',
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${className}`}>
      <div
        className={`${sizeClasses[size]} border-t-transparent rounded-full animate-spin`}
        style={{
          borderColor: color || Colors.accentLight,
          borderTopColor: 'transparent',
        }}
      />
    </div>
  );
}

