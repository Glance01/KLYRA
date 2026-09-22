import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface GlobalThemeSelectorProps {
  /**
   * Style of the selector:
   * - 'segmented': Tabbed toggle pill with "Claro" and "Escuro" (and optional "Auto")
   * - 'toggle': Compact switch button with icon + text
   * - 'icon': Minimal circular/rounded button showing current/opposite mode
   */
  variant?: 'segmented' | 'toggle' | 'icon';
  /** Include system automatic option in segmented view */
  includeAuto?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Optional custom container class name */
  className?: string;
  /** Optional unique HTML ID */
  id?: string;
}

export const GlobalThemeSelector: React.FC<GlobalThemeSelectorProps> = ({
  variant = 'segmented',
  includeAuto = false,
  size = 'md',
  className = '',
  id = 'global-theme-selector',
}) => {
  const { themeMode, effectiveTheme, setThemeMode, toggleTheme } = useTheme();

  // 1. Icon-only Quick Toggle Button
  if (variant === 'icon') {
    const isDark = effectiveTheme === 'dark';
    return (
      <button
        type="button"
        id={id}
        onClick={toggleTheme}
        title={isDark ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
        aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
        className={cn(
          'relative flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer select-none outline-none group',
          size === 'sm' ? 'w-8 h-8 p-1.5' : 'w-9 h-9 p-2',
          'bg-neutral-100/90 dark:bg-neutral-800/80 hover:bg-neutral-200/90 dark:hover:bg-neutral-700/80 border border-neutral-200/80 dark:border-neutral-700/60 text-neutral-700 dark:text-neutral-200 active:scale-95',
          className
        )}
      >
        {isDark ? (
          <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform duration-300" />
        ) : (
          <Moon className="w-4 h-4 text-neutral-700 group-hover:-rotate-12 transition-transform duration-300" />
        )}
      </button>
    );
  }

  // 2. Interactive Toggle Switch
  if (variant === 'toggle') {
    const isDark = effectiveTheme === 'dark';
    return (
      <button
        type="button"
        id={id}
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label="Alternar tema claro e escuro"
        className={cn(
          'w-full flex items-center justify-between px-3 py-2 rounded-xl transition-all duration-200 cursor-pointer select-none outline-none',
          'bg-neutral-100/80 dark:bg-neutral-800/60 hover:bg-neutral-200/70 dark:hover:bg-neutral-700/60 border border-neutral-200/70 dark:border-neutral-700/50 text-neutral-800 dark:text-neutral-200',
          className
        )}
      >
        <div className="flex items-center gap-2.5">
          {isDark ? (
            <Moon className="w-4 h-4 text-[var(--senda-accent,#3B82F6)] shrink-0" />
          ) : (
            <Sun className="w-4 h-4 text-amber-500 shrink-0" />
          )}
          <span className="text-xs font-medium tracking-tight">
            {isDark ? 'Tema Escuro' : 'Tema Claro'}
          </span>
        </div>

        {/* Visual Pill Track */}
        <div 
          className={cn(
            'w-9 h-5 rounded-full p-0.5 transition-colors duration-200 flex items-center',
            isDark ? 'bg-[var(--senda-accent,#3B82F6)] justify-end' : 'bg-neutral-300 dark:bg-neutral-700 justify-start'
          )}
        >
          <div className="w-4 h-4 rounded-full bg-white shadow-xs" />
        </div>
      </button>
    );
  }

  // 3. Segmented Control: Claro vs Escuro (and optionally Auto)
  const isLight = effectiveTheme === 'light';
  const isDark = effectiveTheme === 'dark';

  return (
    <div
      id={id}
      role="group"
      aria-label="Seletor global de tema claro e escuro"
      className={cn(
        'w-full flex items-center p-1 rounded-xl bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/80 dark:border-neutral-800 select-none shadow-xs',
        className
      )}
    >
      {/* Light Option */}
      <button
        type="button"
        id={`${id}-light`}
        onClick={() => setThemeMode('light')}
        aria-pressed={themeMode === 'light' || (!includeAuto && isLight)}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer outline-none',
          (themeMode === 'light' || (!includeAuto && isLight))
            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
            : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
        )}
      >
        <Sun className={cn('w-3.5 h-3.5', isLight ? 'text-amber-500' : 'text-neutral-400')} />
        <span>Claro</span>
      </button>

      {/* Dark Option */}
      <button
        type="button"
        id={`${id}-dark`}
        onClick={() => setThemeMode('dark')}
        aria-pressed={themeMode === 'dark' || (!includeAuto && isDark)}
        className={cn(
          'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer outline-none',
          (themeMode === 'dark' || (!includeAuto && isDark))
            ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
            : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
        )}
      >
        <Moon className={cn('w-3.5 h-3.5', isDark ? 'text-[var(--senda-accent,#3B82F6)]' : 'text-neutral-400')} />
        <span>Escuro</span>
      </button>

      {/* Optional Auto Option */}
      {includeAuto && (
        <button
          type="button"
          id={`${id}-auto`}
          onClick={() => setThemeMode('auto')}
          aria-pressed={themeMode === 'auto'}
          className={cn(
            'flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold tracking-tight transition-all duration-200 cursor-pointer outline-none',
            themeMode === 'auto'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-50 shadow-xs ring-1 ring-black/5 dark:ring-white/10'
              : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
          )}
        >
          <Monitor className="w-3.5 h-3.5 text-neutral-400" />
          <span>Auto</span>
        </button>
      )}
    </div>
  );
};
