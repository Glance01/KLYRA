import React, { useState } from 'react';
import { PresenceStatus } from '../../types';
import { cn } from '../../utils/cn';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  presence?: PresenceStatus;
  className?: string;
  showPresenceBorder?: boolean;
}

export const PRESENCE_CONFIG: Record<PresenceStatus, { label: string; color: string; bg: string }> = {
  available: {
    label: 'Disponível',
    color: '#10B981', // emerald
    bg: 'bg-emerald-500'
  },
  busy: {
    label: 'Ocupado',
    color: '#F59E0B', // amber
    bg: 'bg-amber-500'
  },
  dnd: {
    label: 'Não incomodar',
    color: '#EF4444', // rose/red
    bg: 'bg-rose-500'
  },
  away: {
    label: 'Ausente',
    color: '#9CA3AF', // gray
    bg: 'bg-neutral-400'
  },
  invisible: {
    label: 'Invisível',
    color: '#6B7280',
    bg: 'bg-neutral-500'
  }
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  presence,
  className = '',
  showPresenceBorder = true
}) => {
  const [imageError, setImageError] = useState(false);

  const getInitials = (fullName: string) => {
    const parts = fullName.trim().split(/\s+/);
    if (!parts.length || !parts[0]) return 'S';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const sizeClasses = {
    xs: 'w-7 h-7 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
    xl: 'w-20 h-20 text-2xl'
  }[size];

  const presencePipSizes = {
    xs: 'w-2 h-2 ring-1',
    sm: 'w-2.5 h-2.5 ring-1.5',
    md: 'w-3 h-3 ring-2',
    lg: 'w-4 h-4 ring-2',
    xl: 'w-5 h-5 ring-2'
  }[size];

  return (
    <div className={cn('relative inline-flex shrink-0 select-none items-center justify-center', className)}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-medium tracking-tight',
          'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 border border-neutral-300/40 dark:border-neutral-700/60',
          sizeClasses
        )}
      >
        {src && !imageError ? (
          <img
            src={src}
            alt={name}
            onError={() => setImageError(true)}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {presence && presence !== 'invisible' && (
        <span
          title={PRESENCE_CONFIG[presence].label}
          className={cn(
            'absolute bottom-0 right-0 rounded-full',
            PRESENCE_CONFIG[presence].bg,
            presencePipSizes,
            showPresenceBorder ? 'ring-white dark:ring-[#0B0D0F]' : ''
          )}
        />
      )}
    </div>
  );
};
