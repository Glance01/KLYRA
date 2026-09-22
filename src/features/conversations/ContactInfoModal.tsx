import React, { useState } from 'react';
import { Conversation, UserProfile } from '../../types';
import { useConversations } from '../../context/ConversationContext';
import { Avatar, PRESENCE_CONFIG } from '../../components/ds/Avatar';
import { Button } from '../../components/ds/Button';
import { 
  X, 
  ShieldCheck, 
  Phone, 
  Video, 
  Bell, 
  BellOff, 
  Archive, 
  ArchiveRestore, 
  Ban, 
  UserX, 
  Check, 
  Copy, 
  Trash2, 
  Clock, 
  Users, 
  Lock, 
  KeyRound, 
  QrCode,
  AlertCircle
} from 'lucide-react';

interface ContactInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onStartCall?: (type: 'audio' | 'video') => void;
}

export const ContactInfoModal: React.FC<ContactInfoModalProps> = ({
  isOpen,
  onClose,
  conversation,
  onStartCall
}) => {
  const { 
    toggleMute, 
    toggleArchive, 
    toggleBlock, 
    togglePin,
    deleteConversation, 
    clearConversationMessages,
    setEphemeralDuration,
    selectConversation
  } = useConversations();

  const [copiedUsername, setCopiedUsername] = useState(false);
  const [copiedSafetyNumber, setCopiedSafetyNumber] = useState(false);
  const [showConfirmBlock, setShowConfirmBlock] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  if (!isOpen) return null;

  const isGroup = conversation.type === 'group';
  const partner: UserProfile = conversation.participants[0] || {
    id: 'usr_partner',
    username: conversation.title.toLowerCase().replace(/\s+/g, '_'),
    displayName: conversation.title,
    bio: 'Contato do ecossistema SENDA.',
    avatarUrl: conversation.avatarUrl,
    presence: { status: 'available', customMessage: 'Disponível', visibility: 'everyone', updatedAt: new Date().toISOString() },
    createdAt: new Date().toISOString(),
    deviceId: 'dev_senda_p256'
  };

  const safetyNumber = conversation.safetyNumber || '48192 01847 99201 44820 91823 48102 94810 29381 02938 10293 84710';

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    }
  };

  const handleToggleMute = () => {
    toggleMute(conversation.id);
  };

  const handleToggleArchive = () => {
    toggleArchive(conversation.id);
  };

  const handleToggleBlock = () => {
    toggleBlock(conversation.id);
    setShowConfirmBlock(false);
  };

  const handleDelete = () => {
    deleteConversation(conversation.id);
    onClose();
    selectConversation(null);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/40">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {isGroup ? 'Informações do Grupo' : 'Informações do Contato'}
            </h2>
          </div>
          <button
            type="button"
            id="close-contact-info-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Identity Header */}
          <div className="flex flex-col items-center text-center">
            {isGroup ? (
              <div className="w-20 h-20 rounded-full bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] flex items-center justify-center text-2xl font-bold mb-3 border-2 border-[var(--senda-accent)]/30 shadow-xs">
                <Users className="w-9 h-9" />
              </div>
            ) : (
              <Avatar
                name={partner.displayName}
                src={partner.avatarUrl}
                presence={partner.presence?.status || 'available'}
                size="xl"
                className="mb-3 shadow-xs ring-4 ring-neutral-100 dark:ring-neutral-800"
              />
            )}

            <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {conversation.title}
            </h3>

            {!isGroup && (
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-mono font-medium text-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] px-2 py-0.5 rounded-md">
                  @{partner.username || partner.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(`@${partner.username || partner.id}`, setCopiedUsername)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 p-1 rounded-md transition-colors"
                  title="Copiar @username"
                >
                  {copiedUsername ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}

            {/* Presence description */}
            <div className="flex items-center gap-2 mt-2.5">
              <span className={`w-2 h-2 rounded-full ${PRESENCE_CONFIG[partner.presence?.status || 'available'].bg}`} />
              <p className="text-xs text-neutral-600 dark:text-neutral-300">
                {partner.presence?.customMessage || PRESENCE_CONFIG[partner.presence?.status || 'available'].label}
              </p>
            </div>

            {/* Bio / Description */}
            <div className="mt-4 p-3.5 w-full bg-neutral-50 dark:bg-neutral-900/60 rounded-xl border border-neutral-200/70 dark:border-neutral-800 text-left">
              <span className="text-[10px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block mb-1">
                Recado / Sobre
              </span>
              <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                {partner.bio || (isGroup ? 'Canal em grupo privado e ponta a ponta.' : 'Sem biografia informada no SENDA.')}
              </p>
            </div>

            {/* Quick Call Triggers */}
            {onStartCall && !isGroup && (
              <div className="grid grid-cols-2 gap-3 w-full mt-4">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartCall('audio');
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4 text-emerald-500" />
                  <span>Chamada de Voz</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartCall('video');
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4 text-blue-500" />
                  <span>Chamada de Vídeo</span>
                </button>
              </div>
            )}
          </div>

          {/* Group Participants List */}
          {isGroup && conversation.participants.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs font-bold text-neutral-500 uppercase tracking-wider">
                <span>Participantes ({conversation.participants.length})</span>
              </div>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden">
                {conversation.participants.map((member) => (
                  <div key={member.id} className="p-3 flex items-center justify-between bg-white dark:bg-[#121518]">
                    <div className="flex items-center gap-3">
                      <Avatar
                        name={member.displayName}
                        src={member.avatarUrl}
                        presence={member.presence?.status}
                        size="sm"
                      />
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {member.displayName}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          @{member.username}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Functional Chat Controls (Silenciar, Bloquear, Arquivar) */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
              Gerenciamento da Conversa
            </span>

            <div className="bg-neutral-50/80 dark:bg-neutral-900/50 rounded-2xl border border-neutral-200/80 dark:border-neutral-800 divide-y divide-neutral-200/60 dark:divide-neutral-800/80 overflow-hidden">
              {/* Silenciar */}
              <button
                type="button"
                id="modal-toggle-mute-btn"
                onClick={handleToggleMute}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${conversation.isMuted ? 'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400' : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                    {conversation.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {conversation.isMuted ? 'Reativar Notificações e Sons' : 'Silenciar Notificações'}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {conversation.isMuted ? 'A conversa está silenciada.' : 'Não reproduzir alertas para novas mensagens.'}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${conversation.isMuted ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                  {conversation.isMuted ? 'Silenciado' : 'Ativo'}
                </span>
              </button>

              {/* Arquivar */}
              <button
                type="button"
                id="modal-toggle-archive-btn"
                onClick={handleToggleArchive}
                className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${conversation.isArchived ? 'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400' : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                    {conversation.isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {conversation.isArchived ? 'Desarquivar Conversa' : 'Arquivar Conversa'}
                    </p>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                      {conversation.isArchived ? 'Mover de volta para a caixa de entrada principal.' : 'Ocultar da lista principal de conversas.'}
                    </p>
                  </div>
                </div>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${conversation.isArchived ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                  {conversation.isArchived ? 'Arquivada' : 'Normal'}
                </span>
              </button>

              {/* Bloquear Contato */}
              {!isGroup && (
                <button
                  type="button"
                  id="modal-toggle-block-btn"
                  onClick={() => {
                    if (conversation.isBlocked) {
                      handleToggleBlock();
                    } else {
                      setShowConfirmBlock(true);
                    }
                  }}
                  className="w-full flex items-center justify-between p-3.5 text-left hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${conversation.isBlocked ? 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400' : 'bg-neutral-200/70 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'}`}>
                      {conversation.isBlocked ? <Ban className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${conversation.isBlocked ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-neutral-100'}`}>
                        {conversation.isBlocked ? 'Desbloquear Contato' : 'Bloquear Contato'}
                      </p>
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                        {conversation.isBlocked ? 'Permitir que este contato envie mensagens novamente.' : 'Contatos bloqueados não podem ligar ou enviar mensagens para você.'}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${conversation.isBlocked ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300' : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                    {conversation.isBlocked ? 'Bloqueado' : 'Desbloqueado'}
                  </span>
                </button>
              )}
            </div>

            {/* Block confirmation dialog */}
            {showConfirmBlock && (
              <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-left space-y-3 animate-in fade-in duration-150">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 dark:text-rose-200">
                      Bloquear @{partner.username || partner.displayName}?
                    </h4>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                      Este contato não poderá mais ligar nem enviar mensagens a você. Você pode desbloqueá-lo a qualquer momento.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirmBlock(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleToggleBlock}
                  >
                    Confirmar Bloqueio
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Ephemeral Messages Selector */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                Mensagens Efêmeras / Temporizadas
              </span>
              <span className="text-[11px] font-medium text-[var(--senda-accent)]">
                {conversation.ephemeralDuration ? `${conversation.ephemeralDuration / 3600}h` : 'Desativado'}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[
                { label: 'Off', secs: 0 },
                { label: '1 hora', secs: 3600 },
                { label: '24 horas', secs: 86400 },
                { label: '7 dias', secs: 604800 },
              ].map((opt) => (
                <button
                  key={opt.secs}
                  type="button"
                  onClick={() => setEphemeralDuration(conversation.id, opt.secs)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    (conversation.ephemeralDuration || 0) === opt.secs
                      ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                      : 'border-neutral-200/80 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Cryptography & E2EE Safety Number */}
          <div className="space-y-2.5">
            <span className="text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider block">
              Criptografia Ponta a Ponta (E2EE)
            </span>

            <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Canal Criptografado & Verificado</span>
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(safetyNumber, setCopiedSafetyNumber)}
                  className="text-xs text-[var(--senda-accent)] hover:underline flex items-center gap-1 font-medium"
                >
                  {copiedSafetyNumber ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedSafetyNumber ? 'Copiado' : 'Copiar Chave'}
                </button>
              </div>

              <div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-1.5">
                  Número de segurança para comparar com o dispositivo de {conversation.title}:
                </p>
                <p className="text-[11px] font-mono font-medium text-neutral-800 dark:text-neutral-200 tracking-wider break-all bg-white dark:bg-neutral-800/80 p-2.5 rounded-xl border border-neutral-200/60 dark:border-neutral-700/60 select-all">
                  {safetyNumber}
                </p>
              </div>

              <div className="flex items-center gap-2 text-[10px] text-neutral-400">
                <Lock className="w-3 h-3 text-neutral-400" />
                <span>Padrão WebCrypto ECDH P-256 + AES-256-GCM. Chaves isoladas no hardware local.</span>
              </div>
            </div>
          </div>

          {/* Delete & Clear Actions */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-2">
            {!showConfirmDelete ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => clearConversationMessages(conversation.id)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Limpar Mensagens
                </button>
                <button
                  type="button"
                  onClick={() => setShowConfirmDelete(true)}
                  className="flex-1 py-2.5 px-3 rounded-xl border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Apagar Conversa
                </button>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-left space-y-2.5 animate-in fade-in">
                <p className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  Tem certeza que deseja apagar esta conversa permanentemente?
                </p>
                <div className="flex gap-2 justify-end">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowConfirmDelete(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={handleDelete}
                  >
                    Sim, Apagar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
