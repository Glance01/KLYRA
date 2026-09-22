import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'subtle' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  // Padding Math: horizontal padding is strictly 2x vertical padding
  const sizeStyles = {
    sm: 'text-xs py-1.5 px-3 rounded-lg gap-1.5 h-8',
    md: 'text-sm py-2 px-4 rounded-xl gap-2 h-10',
    lg: 'text-base py-2.5 px-5 rounded-xl gap-2.5 h-12'
  }[size];

  const variantStyles = {
    primary: 'bg-[var(--senda-accent)] hover:bg-[var(--senda-accent-hover)] text-[var(--senda-accent-text)] font-medium shadow-xs active:scale-[0.98]',
    secondary: 'bg-neutral-200/70 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700/80 text-neutral-900 dark:text-neutral-100 font-medium active:scale-[0.98]',
    ghost: 'bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800/60 text-neutral-700 dark:text-neutral-300 active:scale-[0.98]',
    subtle: 'bg-[var(--senda-accent-subtle)] hover:opacity-90 text-[var(--senda-accent)] font-medium active:scale-[0.98]',
    danger: 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-medium active:scale-[0.98]'
  }[variant];

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center font-sans tracking-tight transition-all duration-150 cursor-pointer select-none outline-none disabled:opacity-45 disabled:pointer-events-none disabled:cursor-not-allowed',
        sizeStyles,
        variantStyles,
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
      ) : leftIcon ? (
        <span className="shrink-0">{leftIcon}</span>
      ) : null}

      <span className="truncate whitespace-nowrap">{children}</span>

      {!isLoading && rightIcon && (
        <span className="shrink-0">{rightIcon}</span>
      )}
    </button>
  );
};
