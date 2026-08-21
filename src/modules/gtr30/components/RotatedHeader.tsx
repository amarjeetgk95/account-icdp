import React from 'react';

interface RotatedHeaderProps {
  children: React.ReactNode;
  height?: number;
  bold?: boolean;
  className?: string;
}

/**
 * Renders vertically oriented column headers using standard CSS 2D rotation (transform: rotate(-90deg)).
 * This avoids the html2canvas character-stacking bug caused by `writing-mode: vertical-rl`.
 */
export const RotatedHeader: React.FC<RotatedHeaderProps> = ({
  children,
  height = 150,
  bold = false,
  className = '',
}) => {
  return (
    <div
      style={{
        height: `${height}px`,
        maxHeight: `${height}px`,
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        boxSizing: 'border-box',
      }}
      className={className}
    >
      <div
        style={{
          transform: 'rotate(-90deg)',
          transformOrigin: '0% 100%',
          position: 'absolute',
          left: '50%',
          bottom: '4px',
          width: `${height - 12}px`,
          textAlign: 'left',
          fontSize: '6.7pt',
          lineHeight: '1.15',
          fontFamily: 'Arial, Helvetica, sans-serif',
          fontWeight: bold ? 700 : 600,
          whiteSpace: 'normal',
          wordBreak: 'break-word',
          letterSpacing: '-0.1px',
          marginLeft: '-5.5px',
        }}
      >
        {children}
      </div>
    </div>
  );
};
