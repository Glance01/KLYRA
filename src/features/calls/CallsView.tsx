import React, { useState, useEffect } from 'react';
import { INITIAL_CONTACTS } from '../../services/initialData';
import { UserProfile } from '../../types';
import { Avatar } from '../../components/ds/Avatar';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { 
  Phone, 
  Video, 
  PhoneOff, 
  ArrowUpRight, 
  ArrowDownLeft, 
  AlertCircle,
  X,
  Radio,
  Sparkles,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

interface CallRecord {
  id: string;
  contact: UserProfile;
  type: 'audio' | 'video';
  direction: 'incoming' | 'outgoing' | 'missed';
  timestamp: string;
  duration?: string;
}

const INITIAL_CALL_HISTORY: CallRecord[] = [
  {
    id: 'c_1',
    contact: INITIAL_CONTACTS[0],
    type: 'audio',
    direction: 'outgoing',
    timestamp: 'Hoje, 10:12',
    duration: '04:18'
  },
  {
    id: 'c_2',
    contact: INITIAL_CONTACTS[1],
    type: 'video',
    direction: 'incoming',
    timestamp: 'Ontem, 16:45',
    duration: '12:05'
  },
  {
    id: 'c_3',
    contact: INITIAL_CONTACTS[2],
    type: 'audio',
    direction: 'missed',
    timestamp: 'Sex, 14:20'
  }
];

const ECHO_TEST_CONTACT: UserProfile = {
  id: 'echo_test',
  username: 'teste_de_linha',
  displayName: 'Assistente de Linha (Echo Test)',
  bio: 'Fale ao microfone e ouça sua voz em tempo real para verificar áudio e conexão.',
  avatarUrl: undefined,
  deviceId: 'DEV_SYSTEM_ECHO_01',
  presence: { 
    status: 'available', 
    customMessage: 'Online • Teste Instantâneo',
    visibility: 'everyone',
    updatedAt: new Date().toISOString()
  },
  createdAt: '2025-01-01T00:00:00Z'
};

interface CallsViewProps {
  initialCallContact?: UserProfile | null;
  initialCallType?: 'audio' | 'video';
  onClearInitialCall?: () => void;
}

export const CallsView: React.FC<CallsViewProps> = ({
  initialCallContact,
  initialCallType = 'audio',
  onClearInitialCall
}) => {
  const { t } = useTheme();
  const { currentUser } = useAuth();
  const { startCall, errorMessage, clearError } = useCall();
  const [callHistory, setCallHistory] = useState<CallRecord[]>(INITIAL_CALL_HISTORY);

  // Filter out current user from contacts to avoid calling oneself
  const availableContacts = INITIAL_CONTACTS.filter(c => 
    c.id !== currentUser?.id && 
    c.username?.toLowerCase() !== currentUser?.username?.toLowerCase()
  );

  // Auto-start if opened with an initial call contact from Chat or People View
  useEffect(() => {
    if (initialCallContact) {
      if (initialCallContact.id !== currentUser?.id && initialCallContact.username?.toLowerCase() !== currentUser?.username?.toLowerCase()) {
        startCall(initialCallContact, initialCallType);
      }
      if (onClearInitialCall) onClearInitialCall();
    }
  }, [initialCallContact, initialCallType, currentUser?.id]);

  const handleTriggerCall = (contact: UserProfile, type: 'audio' | 'video') => {
    if (contact.id === currentUser?.id || contact.username?.toLowerCase() === currentUser?.username?.toLowerCase()) {
      return;
    }
    startCall(contact, type);
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      
      {/* Error / Alert Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-3 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={clearError}
            className="p-1 rounded-lg hover:bg-rose-500/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <Phone className="w-3.5 h-3.5" />
            <span>Comunicação WebRTC em Tempo Real</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('calls.title', 'Central de Chamadas')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('calls.subtitle', 'Chamadas reais de voz e vídeo com criptografia P2P')}
          </p>
        </div>
      </div>

      {/* Instant Audio Echo / Line Testing Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-[var(--senda-accent-subtle)] to-transparent border border-emerald-500/20 dark:border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {ECHO_TEST_CONTACT.displayName}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                Teste de Microfone
              </span>
            </div>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5">
              {ECHO_TEST_CONTACT.bio}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => handleTriggerCall(ECHO_TEST_CONTACT, 'audio')}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer shrink-0 w-full sm:w-auto justify-center"
        >
          <Phone className="w-4 h-4" />
          <span>Testar Linha Agora</span>
        </button>
      </div>

      {/* Desktop Responsive Grid: Quick Dial & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Start Contact Row */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 space-y-3 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Iniciar Chamada com Contatos
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            {availableContacts.map((contact) => (
              <div
                key={contact.id}
                className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800/80 flex items-center justify-between gap-2 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Avatar 
                    name={contact.displayName} 
                    src={contact.avatarUrl} 
                    presence={contact.presence?.status} 
                    size="sm" 
                  />
                  <div className="truncate">
                    <p className="text-xs font-bold truncate text-neutral-900 dark:text-neutral-100">{contact.displayName}</p>
                    <p className="text-[10px] text-neutral-500 font-mono">@{contact.username}</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTriggerCall(contact, 'audio')}
                    className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] hover:opacity-85 transition-opacity cursor-pointer"
                    title="Chamada de voz em tempo real"
                  >
                    <Phone className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTriggerCall(contact, 'video')}
                    className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:opacity-85 transition-opacity cursor-pointer"
                    title="Chamada de vídeo WebRTC"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Calls Log */}
        <div className="lg:col-span-6 bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 sm:p-5 space-y-3 shadow-xs">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Histórico Recente
          </h2>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {callHistory.map((call) => (
              <div key={call.id} className="py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar name={call.contact.displayName} src={call.contact.avatarUrl} size="sm" />
                  <div>
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{call.contact.displayName}</h3>
                    <div className="flex items-center gap-1.5 text-[10px] text-neutral-500">
                      {call.direction === 'outgoing' ? (
                        <ArrowUpRight className="w-3 h-3 text-emerald-500" />
                      ) : call.direction === 'incoming' ? (
                        <ArrowDownLeft className="w-3 h-3 text-[var(--senda-accent)]" />
                      ) : (
                        <PhoneOff className="w-3 h-3 text-rose-500" />
                      )}
                      <span>{call.timestamp}</span>
                      {call.duration && (
                        <>
                          <span>•</span>
                          <span>{call.duration}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleTriggerCall(call.contact, call.type)}
                    className="p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 cursor-pointer"
                    title={`Retornar chamada de ${call.type === 'video' ? 'vídeo' : 'voz'}`}
                  >
                    {call.type === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
