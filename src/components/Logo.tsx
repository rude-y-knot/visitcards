import React from 'react';
import { MAGMA_LOGO_COMPACT, MAGMA_LOGO_FULL } from '../utils/pdf/logoGeometry';

interface LogoProps {
  variant?: 'on-dark' | 'on-light';
  compact?: boolean;
  className?: string;
}

export default function Logo({
  variant = 'on-dark',
  compact = false,
  className = 'h-7 w-auto',
}: LogoProps) {
  const geom = compact ? MAGMA_LOGO_COMPACT : MAGMA_LOGO_FULL;
  const wordmarkFill = variant === 'on-dark' ? '#FFFFFF' : '#2A2520';
  const accentFill = '#D12421';
  const vb = `${geom.viewBox.minX} ${geom.viewBox.minY} ${geom.viewBox.width} ${geom.viewBox.height}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={vb}
      className={className}
      aria-label="Magma Home"
      style={{
        shapeRendering: 'geometricPrecision',
        fillRule: 'evenodd',
        clipRule: 'evenodd',
      }}
    >
      <g>
        {geom.paths.map((item, idx) => (
          <path
            key={idx}
            d={item.d}
            fill={item.role === 'accent' ? accentFill : wordmarkFill}
          />
        ))}
      </g>
    </svg>
  );
}
