import React from 'react';
import { motion } from 'motion/react';
import { SendaLogo } from '../ds/SendaLogo';
import { Avatar } from '../ds/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { 
  Sparkles, 
  MessageSquare, 
  Compass, 
  Users, 
  FileText, 
  Sliders, 
  Lock,
  PhoneCall
} from 'lucide-react';

export type SendaView = 'pulse' | 'conversations' | 'moments' | 'people' | 'notes' | 'calls' | 'settings';

interface SendaNavbarProps {
  currentView: SendaView;
  onSelectView: (view: SendaView) => void;
  onOpenProfile: () => void;
  unreadCount?: number;
  isVisible?: boolean;
  isInConversation?: boolean;
}

export const SendaNavbar: React.FC<SendaNavbarProps> = ({
  currentView,
  onSelectView,
  onOpenProfile,
  unreadCount = 0,
  isVisible = true,
  isInConversation = false,
}) => {
  const { currentUser, lockPin, lockAppNow } = useAuth();
  const { t } = useTheme();

  const mainNavItems: { id: SendaView; labelKey: string; defaultLabel: string; icon: React.ComponentType<{ className?: string }>; badge?: number }[] = [
    { id: 'pulse', labelKey: 'nav.pulse', defaultLabel: 'Pulse', icon: Sparkles },
    { id: 'conversations', labelKey: 'nav.conversations', defaultLabel: 'Conversas', icon: MessageSquare, badge: unreadCount },
    { id: 'moments', labelKey: 'nav.moments', defaultLabel: 'Momentos', icon: Compass },
    { id: 'people', labelKey: 'nav.people', defaultLabel: 'Pessoas', icon: Users },
  ];

  const secondaryNavItems: { id: SendaView; labelKey: string; defaultLabel: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'notes', labelKey: 'nav.notes', defaultLabel: 'Notas', icon: FileText },
    { id: 'calls', labelKey: 'nav.calls', defaultLabel: 'Chamadas', icon: PhoneCall },
    { id: 'settings', labelKey: 'nav.settings', defaultLabel: 'Ajustes', icon: Sliders },
  ];

  const isMobileNavVisible = isVisible && !isInConversation;

  return (
    <>
      {/* DESKTOP / TABLET SIDEBAR (Always available on md: screens) */}
      <aside 
        id="senda-desktop-sidebar"
        className="hidden md:flex flex-col justify-between h-screen bg-white/85 dark:bg-[#0E1013]/90 backdrop-blur-md border-r border-neutral-200/80 dark:border-neutral-800/80 p-4 shrink-0 select-none z-30 transition-all duration-200 w-64 lg:w-72"
      >
        <div className="space-y-6">
          {/* Logo Brand Header */}
          <div className="px-2 pt-1 flex items-center justify-between">
            <SendaLogo size={32} showText={true} />
            <div className="flex items-center gap-1.5">
              {lockPin && (
                <button
                  type="button"
                  onClick={lockAppNow}
                  title="Bloquear aplicativo agora"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  <Lock className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Primary Navigation Section */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('nav.main', 'Principal')}
            </p>
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--senda-accent)] font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {/* Fluid Framer Motion active background indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-nav-pill"
                      className="absolute inset-0 rounded-xl bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/20"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}

                  <div className="relative z-10 flex items-center gap-3">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{t(item.labelKey, item.defaultLabel)}</span>
                  </div>

                  {item.badge && item.badge > 0 ? (
                    <span className="relative z-10 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--senda-accent)] text-[var(--senda-accent-text)]">
                      {item.badge}
                    </span>
                  ) : null}
                </motion.button>
              );
            })}
          </div>

          {/* Secondary Navigation Section */}
          <div className="space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <p className="px-3 text-[10px] font-semibold text-neutral-400 dark:text-neutral-500 uppercase tracking-widest mb-1.5">
              {t('nav.spaces', 'Espaços')}
            </p>
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <motion.button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectView(item.id)}
                  whileHover={{ x: 2 }}
                  whileTap={{ scale: 0.98 }}
                  className={`relative w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'text-[var(--senda-accent)] font-semibold'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="desktop-active-nav-pill"
                      className="absolute inset-0 rounded-xl bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/20"
                      transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                    />
                  )}
                  <Icon className="relative z-10 w-4 h-4 shrink-0" />
                  <span className="relative z-10">{t(item.labelKey, item.defaultLabel)}</span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Bottom Section: User Card */}
        <div className="space-y-3 pt-2">
          {currentUser && (
            <div 
              onClick={onOpenProfile}
              className="p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-800/80 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/40 transition-colors flex items-center gap-3 cursor-pointer group"
            >
              <Avatar
                name={currentUser.displayName}
                src={currentUser.avatarUrl}
                presence={currentUser.presence?.status || 'available'}
                size="sm"
              />
              <div className="flex-1 min-w-0 text-left">
                <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 truncate">
                  {currentUser.displayName}
                </p>
                <p className="text-[10px] text-neutral-500 truncate">
                  @{currentUser.username}
                </p>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION (Minimalist bar with fluid Framer Motion pill indicator) */}
      <nav 
        id="senda-bottom-navbar"
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#0E1013]/95 backdrop-blur-md border-t border-neutral-200/80 dark:border-neutral-800 safe-bottom transition-all duration-300 ease-in-out transform ${
          isMobileNavVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-around px-2 py-1.5">
          {mainNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <motion.button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                whileTap={{ scale: 0.92 }}
                className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
                  isActive
                    ? 'text-[var(--senda-accent)]'
                    : 'text-neutral-500 dark:text-neutral-400'
                }`}
              >
                {/* Mobile Active Pill backdrop */}
                {isActive && (
                  <motion.div
                    layoutId="mobile-active-nav-pill"
                    className="absolute inset-0 rounded-xl bg-[var(--senda-accent-subtle)]"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}

                <Icon className="relative z-10 w-5 h-5" />
                <span className="relative z-10 text-[10px] font-medium mt-0.5 tracking-tight">
                  {t(item.labelKey, item.defaultLabel)}
                </span>

                {item.badge && item.badge > 0 ? (
                  <span className="absolute top-1 right-2.5 w-2 h-2 rounded-full bg-[var(--senda-accent)] ring-2 ring-white dark:ring-[#0E1013] z-20" />
                ) : null}

                {isActive && (
                  <motion.span
                    layoutId="mobile-active-dot"
                    className="relative z-10 w-1 h-1 rounded-full bg-[var(--senda-accent)] mt-0.5"
                    transition={{ type: 'spring', stiffness: 500, damping: 36 }}
                  />
                )}
              </motion.button>
            );
          })}

          {/* Quick Settings on mobile */}
          <motion.button
            type="button"
            onClick={() => onSelectView('settings')}
            whileTap={{ scale: 0.92 }}
            className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-colors cursor-pointer ${
              currentView === 'settings'
                ? 'text-[var(--senda-accent)]'
                : 'text-neutral-500 dark:text-neutral-400'
            }`}
          >
            {currentView === 'settings' && (
              <motion.div
                layoutId="mobile-active-nav-pill"
                className="absolute inset-0 rounded-xl bg-[var(--senda-accent-subtle)]"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
            <Sliders className="relative z-10 w-5 h-5" />
            <span className="relative z-10 text-[10px] font-medium mt-0.5 tracking-tight">
              {t('nav.settings', 'Ajustes')}
            </span>
            {currentView === 'settings' && (
              <motion.span
                layoutId="mobile-active-dot"
                className="relative z-10 w-1 h-1 rounded-full bg-[var(--senda-accent)] mt-0.5"
                transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              />
            )}
          </motion.button>
        </div>
      </nav>
    </>
  );
};
