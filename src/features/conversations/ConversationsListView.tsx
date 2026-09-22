import React, { useState } from 'react';
import { useConversations } from '../../context/ConversationContext';
import { useTheme } from '../../context/ThemeContext';
import { Avatar } from '../../components/ds/Avatar';
import { Input } from '../../components/ds/Input';
import { 
  Search, 
  Pin, 
  Bell,
  BellOff, 
  Archive, 
  ArchiveRestore,
  Ban,
  UserX,
  MoreVertical, 
  Trash2, 
  Check, 
  Plus, 
  Clock,
  ShieldCheck,
  Filter
} from 'lucide-react';

interface ConversationsListViewProps {
  onOpenNewChat?: () => void;
  compactMode?: boolean;
}

export const ConversationsListView: React.FC<ConversationsListViewProps> = ({ 
  onOpenNewChat,
  compactMode = false
}) => {
  const { t } = useTheme();
  const { 
    conversations, 
    activeConversationId,
    selectConversation, 
    searchQuery, 
    setSearchQuery,
    togglePin,
    toggleArchive,
    toggleMute,
    toggleBlock,
    deleteConversation 
  } = useConversations();

  const [activeTab, setActiveTab] = useState<'all' | 'unread' | 'archived'>('all');
  const [contextMenuConvId, setContextMenuConvId] = useState<string | null>(null);

  // Filter conversations
  const filtered = conversations.filter(c => {
    const matchesSearch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.lastMessage?.decryptedContent.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (!matchesSearch) return false;

    if (activeTab === 'unread') return c.unreadCount > 0;
    if (activeTab === 'archived') return c.isArchived;
    return !c.isArchived;
  });

  // Sort pinned to top
  const sorted = [...filtered].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return 0;
  });

  return (
    <div className={`w-full ${compactMode ? 'p-3 sm:p-4 space-y-3.5 h-full flex flex-col overflow-y-auto' : 'max-w-4xl mx-auto p-4 sm:p-6 space-y-5'} animate-in fade-in duration-200`}>
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className={`${compactMode ? 'text-xl font-bold' : 'text-2xl font-bold'} tracking-tight text-neutral-900 dark:text-neutral-100 font-sans`}>
            {t('conversations.title', 'Conversas')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">
            {t('pulse.tagline', 'Comunicação direta, ponta a ponta e discreta.')}
          </p>
        </div>

        {onOpenNewChat && (
          <button
            type="button"
            onClick={onOpenNewChat}
            className="px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-[var(--senda-accent)] hover:bg-[var(--senda-accent-hover)] text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('pulse.newChat', 'Nova Conversa')}</span>
          </button>
        )}
      </div>

      {/* Search Input */}
      <div className="w-full shrink-0">
        <Input
          placeholder={t('conversations.searchPlaceholder', 'Pesquisar conversas ou mensagens locais...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftElement={<Search className="w-4 h-4 text-neutral-400" />}
          className="h-10 text-xs sm:text-sm"
        />
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
            activeTab === 'all'
              ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          {t('conversations.allChats', 'Todas')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('unread')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
            activeTab === 'unread'
              ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          {t('conversations.unread', 'Não lidas')}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('archived')}
          className={`px-3 py-1.5 rounded-lg transition-colors font-medium cursor-pointer ${
            activeTab === 'archived'
              ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-semibold'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          {t('conversations.archived', 'Arquivadas')}
        </button>
      </div>

      {/* Conversations List */}
      {sorted.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-3">
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
            {t('conversations.noConversations', 'Nenhuma conversa encontrada.')}
          </p>
          <p className="text-xs text-neutral-500 max-w-xs mx-auto">
            {t('conversations.emptyHelp', 'Quando você iniciar uma conversa com seus contatos, ela aparecerá aqui.')}
          </p>
          {onOpenNewChat && (
            <button
              type="button"
              onClick={onOpenNewChat}
              className="mt-2 text-xs text-[var(--senda-accent)] hover:underline font-medium cursor-pointer"
            >
              {t('people.title', 'Encontrar pessoas')}
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 divide-y divide-neutral-100 dark:divide-neutral-800/60 overflow-hidden shadow-xs">
          {sorted.map((conv) => {
            const partner = conv.participants[0] || { displayName: conv.title, avatarUrl: undefined };
            const isMenuOpen = contextMenuConvId === conv.id;
            const isSelected = activeConversationId === conv.id;

            return (
              <div
                key={conv.id}
                className={`relative group transition-colors ${
                  isSelected
                    ? 'bg-[var(--senda-accent-subtle)]/70 dark:bg-[var(--senda-accent)]/15 border-l-3 border-[var(--senda-accent)]'
                    : 'hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                }`}
              >
                <div
                  onClick={() => selectConversation(conv.id)}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    <Avatar
                      name={partner.displayName}
                      src={partner.avatarUrl}
                      presence={partner.presence?.status}
                      size="md"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5 truncate">
                          <h3 className={`text-sm truncate ${isSelected ? 'font-bold text-[var(--senda-accent)]' : 'font-semibold text-neutral-900 dark:text-neutral-100'}`}>
                            {conv.title}
                          </h3>
                          {conv.isPinned && (
                            <span title="Conversa Fixada" className="inline-flex shrink-0">
                              <Pin className="w-3 h-3 text-[var(--senda-accent)]" />
                            </span>
                          )}
                          {conv.isMuted && (
                            <span title="Silenciado" className="inline-flex shrink-0">
                              <BellOff className="w-3 h-3 text-amber-500" />
                            </span>
                          )}
                          {conv.isBlocked && (
                            <span title="Bloqueado" className="inline-flex shrink-0">
                              <Ban className="w-3 h-3 text-rose-500" />
                            </span>
                          )}
                          {conv.isArchived && (
                            <span title="Arquivado" className="inline-flex shrink-0">
                              <Archive className="w-3 h-3 text-blue-500" />
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] text-neutral-400 shrink-0 ml-2">
                          {conv.updatedAt}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate max-w-sm sm:max-w-md">
                          {conv.isBlocked 
                            ? '🚫 Contato bloqueado' 
                            : (conv.lastMessage?.decryptedContent || 'Iniciar conversa...')}
                        </p>

                        {conv.unreadCount > 0 && (
                          <span className="ml-2 px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[var(--senda-accent)] text-white shrink-0">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Context menu toggle button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setContextMenuConvId(isMenuOpen ? null : conv.id);
                    }}
                    className="p-1.5 rounded-lg opacity-70 sm:opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-all shrink-0 cursor-pointer"
                    title="Mais opções da conversa"
                  >
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Action Options Toolbar shown upon selecting a conversation */}
                {isSelected && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="px-3.5 sm:px-4 pb-3 pt-0.5 flex items-center gap-1.5 overflow-x-auto text-[11px] border-b border-neutral-100/80 dark:border-neutral-800/80 animate-in fade-in duration-150"
                  >
                    {/* Silenciar / Reativar */}
                    <button
                      type="button"
                      id={`conv-mute-action-${conv.id}`}
                      onClick={() => toggleMute(conv.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        conv.isMuted
                          ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={conv.isMuted ? 'Reativar notificações' : 'Silenciar notificações'}
                    >
                      {conv.isMuted ? <BellOff className="w-3.5 h-3.5 text-amber-500" /> : <Bell className="w-3.5 h-3.5" />}
                      <span>{conv.isMuted ? 'Silenciado' : 'Silenciar'}</span>
                    </button>

                    {/* Bloquear / Desbloquear */}
                    <button
                      type="button"
                      id={`conv-block-action-${conv.id}`}
                      onClick={() => toggleBlock(conv.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        conv.isBlocked
                          ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30'
                      }`}
                      title={conv.isBlocked ? 'Desbloquear este contato' : 'Bloquear este contato'}
                    >
                      {conv.isBlocked ? <Ban className="w-3.5 h-3.5 text-rose-500" /> : <UserX className="w-3.5 h-3.5" />}
                      <span>{conv.isBlocked ? 'Bloqueado' : 'Bloquear'}</span>
                    </button>

                    {/* Arquivar / Desarquivar */}
                    <button
                      type="button"
                      id={`conv-archive-action-${conv.id}`}
                      onClick={() => toggleArchive(conv.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        conv.isArchived
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={conv.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}
                    >
                      {conv.isArchived ? <ArchiveRestore className="w-3.5 h-3.5 text-blue-500" /> : <Archive className="w-3.5 h-3.5" />}
                      <span>{conv.isArchived ? 'Arquivada' : 'Arquivar'}</span>
                    </button>

                    {/* Fixar */}
                    <button
                      type="button"
                      id={`conv-pin-action-${conv.id}`}
                      onClick={() => togglePin(conv.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
                        conv.isPinned
                          ? 'bg-[var(--senda-accent-subtle)] border-[var(--senda-accent)]/40 text-[var(--senda-accent)]'
                          : 'bg-white dark:bg-neutral-800/80 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-700'
                      }`}
                      title={conv.isPinned ? 'Desafixar conversa' : 'Fixar conversa'}
                    >
                      <Pin className="w-3.5 h-3.5" />
                      <span>{conv.isPinned ? 'Fixada' : 'Fixar'}</span>
                    </button>
                  </div>
                )}

                {/* Context Menu Dropdown */}
                {isMenuOpen && (
                  <div 
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-4 top-12 z-20 w-48 rounded-xl bg-white dark:bg-[#1A1D21] border border-neutral-200 dark:border-neutral-800 shadow-xl p-1.5 text-xs space-y-0.5 animate-in fade-in"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        togglePin(conv.id);
                        setContextMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                    >
                      <Pin className="w-3.5 h-3.5 text-neutral-400" />
                      <span>{conv.isPinned ? t('conversations.unpin', 'Desafixar') : t('conversations.pin', 'Fixar conversa')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleMute(conv.id);
                        setContextMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                    >
                      {conv.isMuted ? <Bell className="w-3.5 h-3.5 text-amber-500" /> : <BellOff className="w-3.5 h-3.5 text-neutral-400" />}
                      <span>{conv.isMuted ? t('conversations.unmute', 'Reativar som') : t('conversations.mute', 'Silenciar')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleArchive(conv.id);
                        setContextMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                    >
                      {conv.isArchived ? <ArchiveRestore className="w-3.5 h-3.5 text-blue-500" /> : <Archive className="w-3.5 h-3.5 text-neutral-400" />}
                      <span>{conv.isArchived ? t('conversations.unarchive', 'Desarquivar') : t('conversations.archive', 'Arquivar')}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        toggleBlock(conv.id);
                        setContextMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                    >
                      {conv.isBlocked ? <Ban className="w-3.5 h-3.5 text-rose-500" /> : <UserX className="w-3.5 h-3.5 text-neutral-400" />}
                      <span>{conv.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}</span>
                    </button>

                    <div className="border-t border-neutral-100 dark:border-neutral-800 my-1" />

                    <button
                      type="button"
                      onClick={() => {
                        deleteConversation(conv.id);
                        setContextMenuConvId(null);
                      }}
                      className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>{t('conversations.delete', 'Apagar conversa')}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
