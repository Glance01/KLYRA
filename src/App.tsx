import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ConversationProvider, useConversations } from './context/ConversationContext';
import { CallProvider, useCall } from './context/CallContext';
import { UserProfile } from './types';
import { SendaNavbar, SendaView } from './components/navigation/SendaNavbar';
import { OnboardingView } from './features/onboarding/OnboardingView';
import { PulseView } from './features/pulse/PulseView';
import { ConversationsContainer } from './features/conversations/ConversationsContainer';
import { MomentsView } from './features/moments/MomentsView';
import { PeopleView } from './features/people/PeopleView';
import { NotesView } from './features/notes/NotesView';
import { CallsView } from './features/calls/CallsView';
import { PersonalizationView } from './features/settings/PersonalizationView';
import { PrivacySecurityView } from './features/settings/PrivacySecurityView';
import { ProfileModal } from './features/profile/ProfileModal';
import { AppLockOverlay } from './components/security/AppLockOverlay';
import { GlobalThemeSelector } from './components/ds/GlobalThemeSelector';
import { PWAInstallPrompt } from './components/pwa/PWAInstallPrompt';
import { IncomingCallModal } from './components/calls/IncomingCallModal';
import { ActiveCallOverlay } from './components/calls/ActiveCallOverlay';
import { motion, AnimatePresence } from 'motion/react';

const VIEW_ORDER: Record<SendaView, number> = {
  pulse: 0,
  conversations: 1,
  moments: 2,
  people: 3,
  notes: 4,
  calls: 5,
  settings: 6,
};

const viewTransitionVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 36 : -36,
    opacity: 0,
    scale: 0.99,
    filter: 'blur(4px)',
  }),
  center: {
    x: 0,
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
    transition: {
      x: { type: 'spring' as const, stiffness: 380, damping: 34, mass: 0.8 },
      opacity: { duration: 0.22, ease: [0.16, 1, 0.3, 1] as const },
      scale: { duration: 0.24, ease: [0.16, 1, 0.3, 1] as const },
      filter: { duration: 0.18 },
    },
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -28 : 28,
    opacity: 0,
    scale: 0.99,
    filter: 'blur(3px)',
    transition: {
      x: { duration: 0.18, ease: [0.32, 0, 0.67, 0] as const },
      opacity: { duration: 0.16, ease: 'easeIn' as const },
      scale: { duration: 0.18 },
      filter: { duration: 0.14 },
    },
  }),
};

const SendaMainShell: React.FC = () => {
  const { hasCompletedOnboarding, isLoading, currentUser } = useAuth();
  const { activeConversation, activeConversationId, selectConversation, totalUnreadCount } = useConversations();
  const { startCall } = useCall();
  const [currentView, setCurrentView] = useState<SendaView>('pulse');
  const [prevView, setPrevView] = useState<SendaView>('pulse');
  const [settingsTab, setSettingsTab] = useState<'visual' | 'privacy'>('visual');
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [activeCallTarget, setActiveCallTarget] = useState<{
    contact: UserProfile;
    type: 'audio' | 'video';
  } | null>(null);

  // Compute navigation direction: 1 = forwards, -1 = backwards
  const direction = (VIEW_ORDER[currentView] ?? 0) >= (VIEW_ORDER[prevView] ?? 0) ? 1 : -1;

  const handleNavigateView = (view: SendaView) => {
    if (view === currentView) return;
    setPrevView(currentView);
    if (view !== 'conversations') {
      selectConversation(null);
    }
    setCurrentView(view);
  };

  // Navigation visibility on scroll and when in conversation
  const [isNavVisible, setIsNavVisible] = useState(true);
  const lastScrollY = useRef(0);
  const touchStartY = useRef<number | null>(null);
  const mainRef = useRef<HTMLElement>(null);

  const isInConversation = currentView === 'conversations' && Boolean(activeConversationId);

  // Scroll detection on the main container ("deslizar pra cima" hides, "deslizar pra baixo" shows)
  const handleScroll = (e: React.UIEvent<HTMLElement>) => {
    if (isInConversation) return;
    const currentScrollTop = e.currentTarget.scrollTop;
    const delta = currentScrollTop - lastScrollY.current;

    if (currentScrollTop <= 24) {
      // Near the very top, always show navbar
      setIsNavVisible(true);
    } else if (delta > 8 && currentScrollTop > 40) {
      // Swiping up / scrolling down content: hide navbar smoothly
      setIsNavVisible(false);
    } else if (delta < -8) {
      // Swiping down / scrolling up content: show navbar smoothly
      setIsNavVisible(true);
    }

    lastScrollY.current = currentScrollTop;
  };

  // Touch gesture detection for responsive mobile swipe
  const handleTouchStart = (e: React.TouchEvent<HTMLElement>) => {
    if (isInConversation) return;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLElement>) => {
    if (isInConversation || touchStartY.current === null) return;
    const currentY = e.touches[0].clientY;
    const delta = touchStartY.current - currentY;

    // delta > 12: finger slid upwards ("deslizar pra cima")
    if (delta > 12) {
      setIsNavVisible(false);
      touchStartY.current = currentY;
    } else if (delta < -12) {
      // delta < -12: finger slid downwards ("deslizar pra baixo")
      setIsNavVisible(true);
      touchStartY.current = currentY;
    }
  };

  // Reset navbar visibility and main scroll position when navigating between views or conversations
  useEffect(() => {
    setIsNavVisible(true);
    if (mainRef.current) {
      mainRef.current.scrollTop = 0;
      lastScrollY.current = 0;
    }
  }, [currentView, activeConversationId]);

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAF9F6] dark:bg-[#0B0D0F] text-neutral-900 dark:text-neutral-100">
        <div className="w-8 h-8 border-2 border-[var(--senda-accent,#2563EB)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!hasCompletedOnboarding) {
    return <OnboardingView />;
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FAF9F6] dark:bg-[#0B0D0F] text-neutral-900 dark:text-neutral-100 transition-colors duration-200 overflow-x-hidden">
      {/* PWA Proactive Install Prompt with blue app logo */}
      <PWAInstallPrompt />

      {/* App Lock PIN Screen */}
      <AppLockOverlay />

      {/* Navigation: Desktop Sidebar + Mobile Bottom Bar */}
      <SendaNavbar
        currentView={currentView}
        onSelectView={handleNavigateView}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        unreadCount={totalUnreadCount}
        isVisible={isNavVisible}
        isInConversation={isInConversation}
      />

      {/* Main Content Viewport */}
      <main 
        ref={mainRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        className={`flex-1 flex flex-col h-screen min-h-0 ${
          currentView === 'conversations'
            ? 'overflow-hidden pb-0' 
            : isInConversation 
              ? 'overflow-hidden pb-0' 
              : 'overflow-y-auto pb-20 md:pb-0'
        }`}
      >
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={currentView}
            custom={direction}
            variants={viewTransitionVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="flex-1 flex flex-col h-full min-h-0"
          >
            {currentView === 'pulse' && (
              <PulseView
                onNavigate={handleNavigateView}
                onOpenProfile={() => setIsProfileModalOpen(true)}
              />
            )}

            {currentView === 'conversations' && (
              <ConversationsContainer
                onOpenNewChat={() => handleNavigateView('people')}
                onNavigateToPeople={() => handleNavigateView('people')}
                onNavigateToNotes={() => handleNavigateView('notes')}
                onStartCall={(type) => {
                  const partner = activeConversation?.participants.find(p => p.id !== currentUser?.id) || activeConversation?.participants[0];
                  if (partner && partner.id !== currentUser?.id) {
                    startCall(partner, type);
                  }
                }}
              />
            )}

            {currentView === 'moments' && <MomentsView />}

            {currentView === 'people' && (
              <PeopleView
                onOpenConversation={() => handleNavigateView('conversations')}
                onStartCall={(contact, type) => {
                  setActiveCallTarget({ contact, type });
                  handleNavigateView('calls');
                }}
              />
            )}

            {currentView === 'notes' && <NotesView />}

            {currentView === 'calls' && (
              <CallsView
                initialCallContact={activeCallTarget?.contact}
                initialCallType={activeCallTarget?.type}
                onClearInitialCall={() => setActiveCallTarget(null)}
              />
            )}

            {currentView === 'settings' && (
              <div className="w-full">
                {/* Secondary Header Tab for Settings with smooth gliding pill */}
                <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 flex items-center gap-2 border-b border-neutral-200/80 dark:border-neutral-800 pb-2">
                  <button
                    type="button"
                    onClick={() => setSettingsTab('visual')}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      settingsTab === 'visual'
                        ? 'text-[var(--senda-accent)]'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {settingsTab === 'visual' && (
                      <motion.div
                        layoutId="settings-subtab-pill"
                        className="absolute inset-0 rounded-lg bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/20"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">Personalização Visual</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSettingsTab('privacy')}
                    className={`relative px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                      settingsTab === 'privacy'
                        ? 'text-[var(--senda-accent)]'
                        : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
                    }`}
                  >
                    {settingsTab === 'privacy' && (
                      <motion.div
                        layoutId="settings-subtab-pill"
                        className="absolute inset-0 rounded-lg bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/20"
                        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      />
                    )}
                    <span className="relative z-10">Privacidade & Dispositivos E2EE</span>
                  </button>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={settingsTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                  >
                    {settingsTab === 'visual' ? (
                      <PersonalizationView />
                    ) : (
                      <PrivacySecurityView />
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Mobile Floating Theme Toggle (when not in a chat) */}
      {!isInConversation && isNavVisible && (
        <div className="md:hidden fixed top-3 right-3 z-30 transition-all duration-300 animate-in fade-in">
          <GlobalThemeSelector id="mobile-top-theme-toggle" variant="icon" size="sm" />
        </div>
      )}

      {/* Global Call Overlays: Ringing Modal & Live Call Stage */}
      <IncomingCallModal />
      <ActiveCallOverlay />

      {/* Global Profile & Presence Modal */}
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <CallProvider>
          <ConversationProvider>
            <SendaMainShell />
          </ConversationProvider>
        </CallProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
