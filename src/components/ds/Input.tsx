import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  error,
  hint,
  leftElement,
  rightElement,
  className = '',
  disabled,
  id,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;

  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label 
          htmlFor={inputId} 
          className="text-xs font-medium text-neutral-600 dark:text-neutral-400 tracking-tight select-none"
        >
          {label}
        </label>
      )}

      <div className={cn(
        'relative flex items-center w-full transition-all duration-150',
        'bg-neutral-100/80 dark:bg-neutral-900/90 rounded-xl',
        'border border-neutral-300/80 dark:border-neutral-800',
        'focus-within:border-[var(--senda-accent)] focus-within:ring-1 focus-within:ring-[var(--senda-accent)]',
        error && 'border-rose-500 focus-within:border-rose-500 focus-within:ring-rose-500',
        disabled && 'opacity-50 cursor-not-allowed bg-neutral-200/50 dark:bg-neutral-800/40'
      )}>
        {leftElement && (
          <div className="pl-3.5 pr-1 flex items-center text-neutral-500 dark:text-neutral-400 shrink-0">
            {leftElement}
          </div>
        )}

        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            'w-full bg-transparent px-3.5 py-2.5 text-sm text-neutral-900 dark:text-neutral-100',
            'placeholder:text-neutral-400 dark:placeholder:text-neutral-500 outline-none',
            leftElement && 'pl-2',
            rightElement && 'pr-2',
            className
          )}
          {...props}
        />

        {rightElement && (
          <div className="pr-3.5 pl-1 flex items-center text-neutral-500 dark:text-neutral-400 shrink-0">
            {rightElement}
          </div>
        )}
      </div>

      {error ? (
        <p className="text-xs text-rose-500 dark:text-rose-400 font-normal">{error}</p>
      ) : hint ? (
        <p className="text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
});

Input.displayName = 'Input';
