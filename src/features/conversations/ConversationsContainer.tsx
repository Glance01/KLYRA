import React from 'react';
import { useConversations } from '../../context/ConversationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { ConversationsListView } from './ConversationsListView';
import { IndividualChatView } from './IndividualChatView';
import { 
  ShieldCheck, 
  MessageSquare, 
  Plus, 
  Users, 
  Lock, 
  KeyRound, 
  Sparkles,
  Command
} from 'lucide-react';

interface ConversationsContainerProps {
  onOpenNewChat: () => void;
  onNavigateToPeople?: () => void;
  onNavigateToNotes?: () => void;
  onStartCall: (type: 'audio' | 'video') => void;
}

export const ConversationsContainer: React.FC<ConversationsContainerProps> = ({
  onOpenNewChat,
  onNavigateToPeople,
  onNavigateToNotes,
  onStartCall
}) => {
  const { activeConversation, activeConversationId, selectConversation } = useConversations();
  const { currentUser, deviceKeys } = useAuth();
  const { t } = useTheme();

  return (
    <div className="w-full h-full flex flex-col md:flex-row min-h-0 overflow-hidden">
      {/* MOBILE VIEW (< md) */}
      <div className="md:hidden w-full h-full min-h-0 flex flex-col">
        {activeConversationId ? (
          <IndividualChatView
            onBack={() => selectConversation(null)}
            onStartCall={onStartCall}
          />
        ) : (
          <ConversationsListView
            onOpenNewChat={onOpenNewChat}
          />
        )}
      </div>

      {/* DESKTOP / TABLET DUAL-PANE VIEW (>= md) */}
      <div className="hidden md:flex w-full h-full min-h-0">
        {/* Left Side: Conversations Master List */}
        <aside className="w-80 lg:w-96 xl:w-[380px] h-full border-r border-neutral-200/80 dark:border-neutral-800 flex flex-col bg-white/70 dark:bg-[#0E1013]/70 shrink-0 min-w-0">
          <ConversationsListView
            onOpenNewChat={onOpenNewChat}
            compactMode={true}
          />
        </aside>

        {/* Right Side: Active Chat Detail OR Desktop Empty Placeholder */}
        <section className="flex-1 h-full min-w-0 flex flex-col bg-[#FAF9F6] dark:bg-[#0B0D0F] relative">
          {activeConversationId ? (
            <IndividualChatView
              onBack={() => selectConversation(null)}
              onStartCall={onStartCall}
              hideBackOnDesktop={true}
            />
          ) : (
            <div className="flex-1 h-full flex flex-col items-center justify-center p-8 text-center select-none animate-in fade-in duration-200">
              <div className="max-w-md w-full space-y-6">
                {/* Visual Encrypted Icon */}
                <div className="relative mx-auto w-20 h-20 rounded-3xl bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/25 flex items-center justify-center text-[var(--senda-accent)] shadow-sm">
                  <MessageSquare className="w-10 h-10" />
                  <div className="absolute -bottom-1.5 -right-1.5 p-1.5 rounded-full bg-emerald-500 text-white shadow-xs">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                </div>

                {/* Greeting & Info */}
                <div className="space-y-2">
                  <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
                    SENDA Mensagens Seguras
                  </h2>
                  <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 leading-relaxed max-w-sm mx-auto">
                    Selecione uma conversa ao lado para visualizar mensagens protegidas com criptografia de ponta a ponta (E2EE) ou inicie um novo canal.
                  </p>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={onOpenNewChat}
                    className="p-3.5 rounded-2xl bg-white dark:bg-[#14171B] border border-neutral-200/80 dark:border-neutral-800 hover:border-[var(--senda-accent)] hover:shadow-xs transition-all text-left flex items-start gap-3 group cursor-pointer"
                  >
                    <div className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] group-hover:scale-105 transition-transform">
                      <Plus className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        {t('pulse.newChat', 'Nova Conversa')}
                      </h4>
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Adicionar por username
                      </p>
                    </div>
                  </button>

                  {onNavigateToPeople && (
                    <button
                      type="button"
                      onClick={onNavigateToPeople}
                      className="p-3.5 rounded-2xl bg-white dark:bg-[#14171B] border border-neutral-200/80 dark:border-neutral-800 hover:border-[var(--senda-accent)] hover:shadow-xs transition-all text-left flex items-start gap-3 group cursor-pointer"
                    >
                      <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 group-hover:scale-105 transition-transform">
                        <Users className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                          {t('people.title', 'Pessoas & Grupos')}
                        </h4>
                        <p className="text-[11px] text-neutral-400 mt-0.5">
                          Explorar diretório
                        </p>
                      </div>
                    </button>
                  )}
                </div>

                {/* Security Tag */}
                <div className="pt-4 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center justify-center gap-4 text-[11px] text-neutral-400 dark:text-neutral-500">
                  <div className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Criptografia E2EE (AES-256)</span>
                  </div>
                  <span>•</span>
                  <div className="inline-flex items-center gap-1">
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Chaves Locais no Navegador</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
