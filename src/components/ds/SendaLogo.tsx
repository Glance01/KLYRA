import React from 'react';

interface SendaLogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textColor?: string;
  accentColor?: string;
}

export const SendaLogo: React.FC<SendaLogoProps> = ({
  size = 32,
  className = '',
  showText = true,
  textColor,
  accentColor,
}) => {
  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 transition-transform duration-300 hover:scale-105"
        aria-label="Símbolo SENDA"
      >
        {/* Subtle geometric convergence representing path, connection and meeting */}
        <defs>
          <linearGradient id="senda-path-a" x1="6" y1="12" x2="38" y2="28" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity="0.35" />
            <stop stopColor={accentColor || 'var(--senda-accent, #3b82f6)'} />
          </linearGradient>
          <linearGradient id="senda-path-b" x1="42" y1="36" x2="10" y2="20" gradientUnits="userSpaceOnUse">
            <stop stopColor="currentColor" stopOpacity="0.2" />
            <stop stopColor={accentColor || 'var(--senda-accent, #3b82f6)'} />
          </linearGradient>
        </defs>

        {/* Path 1: Smooth curved pathway flowing inwards */}
        <path
          d="M8 34C14 34 18 30 22 24C26 18 30 14 40 14"
          stroke="url(#senda-path-a)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Path 2: Converging reciprocal path meeting at the nexus */}
        <path
          d="M40 34C34 34 30 30 26 24C22 18 18 14 8 14"
          stroke="url(#senda-path-b)"
          strokeWidth="3.5"
          strokeLinecap="round"
        />

        {/* Center connection node: Meeting / Continuity point */}
        <circle
          cx="24"
          cy="24"
          r="4"
          fill={accentColor || 'var(--senda-accent, #3b82f6)'}
        />
        <circle
          cx="24"
          cy="24"
          r="7"
          stroke={accentColor || 'var(--senda-accent, #3b82f6)'}
          strokeWidth="1.5"
          strokeOpacity="0.35"
        />
      </svg>

      {showText && (
        <span
          className={`font-bold tracking-wider text-sm md:text-base uppercase ${textColor || 'text-current'}`}
          style={{ letterSpacing: '0.18em' }}
        >
          SENDA
        </span>
      )}
    </div>
  );
};
