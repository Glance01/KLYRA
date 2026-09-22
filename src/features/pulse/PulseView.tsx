import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationContext';
import { useTheme } from '../../context/ThemeContext';
import { INITIAL_CONTACTS, INITIAL_MOMENTS } from '../../services/initialData';
import { Avatar } from '../../components/ds/Avatar';
import { SendaView } from '../../components/navigation/SendaNavbar';
import { AiAtmosphereWidget } from '../../components/widgets/AiAtmosphereWidget';
import { 
  Sparkles, 
  MessageSquare, 
  Compass, 
  ShieldCheck, 
  ArrowUpRight,
  Clock,
  Pin
} from 'lucide-react';

interface PulseViewProps {
  onNavigate: (view: SendaView) => void;
  onOpenProfile: () => void;
}

export const PulseView: React.FC<PulseViewProps> = ({ onNavigate, onOpenProfile }) => {
  const { currentUser, deviceKeys } = useAuth();
  const { conversations, selectConversation } = useConversations();
  const { t } = useTheme();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return t('pulse.goodMorning', 'Bom dia');
    if (hour >= 12 && hour < 18) return t('pulse.goodAfternoon', 'Boa tarde');
    return t('pulse.goodEvening', 'Boa noite');
  };

  const firstName = currentUser?.displayName.split(' ')[0] || t('pulse.you', 'Você');
  const greeting = `${getGreeting()}, ${firstName}.`;

  const availableContacts = INITIAL_CONTACTS.filter(c => (c.presence?.status || 'available') === 'available');
  const recentConversations = conversations.slice(0, 3);
  const featuredMoments = INITIAL_MOMENTS.slice(0, 2);

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 animate-in fade-in duration-200">
      {/* Header Greeting & AI Atmosphere Widget */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 border-b border-neutral-200/80 dark:border-neutral-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PULSE • SENDA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {greeting}
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 font-normal">
            {t('pulse.whatIsHappening', 'O que está acontecendo?')}
          </p>

          <div 
            onClick={onOpenProfile}
            className="inline-flex items-center gap-2 mt-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium cursor-pointer hover:bg-emerald-500/15 transition-colors"
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>{t('pulse.deviceProtected', 'Dispositivo Protegido • E2EE')}</span>
          </div>
        </div>

        {/* AI Atmosphere Widget */}
        <div className="w-full md:w-80 lg:w-96 shrink-0">
          <AiAtmosphereWidget />
        </div>
      </div>

      {/* 1. Pessoas Disponíveis (Minimal horizontal Presence reel) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {t('pulse.onlineNow', 'Pessoas Disponíveis Agora')}
          </h2>
          <button
            type="button"
            onClick={() => onNavigate('people')}
            className="text-xs text-[var(--senda-accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
          >
            {t('pulse.quickActions', 'Ver todas')} <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {/* Current user's own presence card */}
          {currentUser && (
            <div
              onClick={onOpenProfile}
              className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#121518] border border-neutral-200/80 dark:border-neutral-800 shrink-0 w-32 sm:w-36 text-center cursor-pointer hover:border-[var(--senda-accent)] transition-all shadow-xs"
            >
              <Avatar
                name={currentUser.displayName}
                src={currentUser.avatarUrl}
                presence={currentUser.presence?.status || 'available'}
                size="md"
                className="mb-2"
              />
              <p className="text-xs font-semibold truncate w-full">{t('pulse.you', 'Você')}</p>
              <p className="text-[10px] text-neutral-500 truncate w-full mt-0.5">
                {currentUser.presence?.customMessage || t('pulse.editPresence', 'Editar presença')}
              </p>
            </div>
          )}

          {availableContacts.map((contact) => (
            <div
              key={contact.id}
              onClick={() => {
                onNavigate('conversations');
              }}
              className="flex flex-col items-center p-3 rounded-2xl bg-white dark:bg-[#121518] border border-neutral-200/80 dark:border-neutral-800 shrink-0 w-32 sm:w-36 text-center cursor-pointer hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group shadow-xs"
            >
              <Avatar
                name={contact.displayName}
                src={contact.avatarUrl}
                presence={contact.presence?.status || 'available'}
                size="md"
                className="mb-2 group-hover:scale-105 transition-transform"
              />
              <p className="text-xs font-semibold truncate w-full">{contact.displayName.split(' ')[0]}</p>
              <p className="text-[10px] text-emerald-500 font-medium truncate w-full mt-0.5">
                {contact.presence?.customMessage || t('common.available', 'Disponível')}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 2 & 3. Responsive Desktop Bento Grid (Conversations & Moments side-by-side on lg:) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* 2. Conversas Recentes */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {t('pulse.recentConversations', 'Conversas Recentes')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('conversations')}
              className="text-xs text-[var(--senda-accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              {t('pulse.openConversations', 'Abrir conversas')} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden shadow-xs">
            {recentConversations.map((conv) => {
              const partner = conv.participants[0] || { displayName: conv.title, avatarUrl: undefined };
              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    selectConversation(conv.id);
                    onNavigate('conversations');
                  }}
                  className="p-3.5 sm:p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/40 transition-colors flex items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar
                      name={partner.displayName}
                      src={partner.avatarUrl}
                      presence={partner.presence?.status}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-[var(--senda-accent)] transition-colors">
                          {conv.title}
                        </h3>
                        {conv.isPinned && (
                          <Pin className="w-3 h-3 text-[var(--senda-accent)] shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate mt-0.5 max-w-md">
                        {conv.lastMessage?.decryptedContent || t('conversations.noRecentMessages', 'Nenhuma mensagem recente')}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 gap-1">
                    <span className="text-[11px] text-neutral-400">
                      {conv.updatedAt}
                    </span>
                    {conv.unreadCount > 0 && (
                      <span className="w-2 h-2 rounded-full bg-[var(--senda-accent)]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. Destaques de Momentos */}
        <section className="lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
              {t('pulse.recentMoments', 'Momentos Recentes')}
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('moments')}
              className="text-xs text-[var(--senda-accent)] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              {t('pulse.exploreMoments', 'Explorar momentos')} <ArrowUpRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {featuredMoments.map((moment) => (
              <div
                key={moment.id}
                onClick={() => onNavigate('moments')}
                className="p-4 rounded-2xl bg-white dark:bg-[#121518] border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all cursor-pointer flex flex-col justify-between space-y-3 group shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      name={moment.author.displayName}
                      src={moment.author.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-semibold">{moment.author.displayName}</p>
                      <p className="text-[10px] text-neutral-400">{moment.createdAt}</p>
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-medium">
                    {moment.type === 'photo' ? t('pulse.photo', 'Foto') : moment.type === 'thought' ? t('pulse.thought', 'Reflexão') : t('pulse.audio', 'Áudio')}
                  </span>
                </div>

                {moment.mediaUrl && (
                  <div className="w-full h-36 rounded-xl overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    <img
                      src={moment.mediaUrl}
                      alt="Momento"
                      className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}

                <p className="text-xs text-neutral-700 dark:text-neutral-300 line-clamp-2 leading-relaxed">
                  "{moment.content}"
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};
