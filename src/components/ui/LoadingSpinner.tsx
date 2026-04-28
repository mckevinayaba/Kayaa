import React from 'react';

interface LoadingSpinnerProps {
  /** Size in px (default 32) */
  size?: number;
  /** Accent colour (default Kayaa green) */
  color?: string;
  /** Extra wrapper padding (default 32px) */
  padding?: number | string;
}

export function LoadingSpinner({
  size    = 32,
  color   = '#39D98A',
  padding = 32,
}: LoadingSpinnerProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding,
      }}
    >
      <div
        style={{
          width:  size,
          height: size,
          borderRadius: '50%',
          border: `3px solid ${color}33`,
          borderTopColor: color,
          animation: 'spin 0.7s linear infinite',
          flexShrink: 0,
        }}
      />
    </div>
  );
}

export default LoadingSpinner;
