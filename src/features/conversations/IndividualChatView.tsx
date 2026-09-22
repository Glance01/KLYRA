import React, { useState, useRef, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useConversations } from '../../context/ConversationContext';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { SendaMessage, MessageDeliveryStatus } from '../../types';
import { Avatar, PRESENCE_CONFIG } from '../../components/ds/Avatar';
import { Button } from '../../components/ds/Button';
import { DeviceCameraCaptureModal } from '../../components/media/DeviceCameraCaptureModal';
import { processDeviceImageFile } from '../../services/storageService';
import { VirtualizedMessageList } from '../../components/chat/VirtualizedMessageList';
import { ContactInfoModal } from './ContactInfoModal';
import { 
  ArrowLeft, 
  ShieldCheck, 
  Clock, 
  MoreVertical, 
  Send, 
  Mic, 
  MicOff, 
  Smile, 
  Paperclip, 
  Image as ImageIcon, 
  Camera,
  X, 
  Reply, 
  Play, 
  Pause, 
  Check, 
  Copy, 
  QrCode,
  Phone,
  Video,
  Users,
  Maximize2,
  Trash2,
  Download,
  Ban,
  UserX,
  Bell,
  BellOff,
  Archive,
  ArchiveRestore,
  Info
} from 'lucide-react';

interface IndividualChatViewProps {
  onBack: () => void;
  onStartCall?: (type: 'audio' | 'video') => void;
  hideBackOnDesktop?: boolean;
}

export const IndividualChatView: React.FC<IndividualChatViewProps> = ({ 
  onBack, 
  onStartCall,
  hideBackOnDesktop = false
}) => {
  const { 
    activeConversation, 
    activeMessages,
    sendMessage, 
    toggleReaction, 
    setEphemeralDuration,
    togglePin,
    toggleMute,
    toggleArchive,
    toggleBlock 
  } = useConversations();
  
  const { currentUser } = useAuth();
  const { settings, t } = useTheme();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<SendaMessage | null>(null);
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null);
  const [showSafetyModal, setShowSafetyModal] = useState(false);
  const [showEphemeralMenu, setShowEphemeralMenu] = useState(false);
  const [showContactInfoModal, setShowContactInfoModal] = useState(false);
  const [showChatOptionsMenu, setShowChatOptionsMenu] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  // Attached image or video state before sending
  const [pendingMedia, setPendingMedia] = useState<string | null>(null);
  const [pendingMediaType, setPendingMediaType] = useState<'image' | 'video' | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voice recording state
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isRecordingPaused, setIsRecordingPaused] = useState(false);
  const [liveWaveformBars, setLiveWaveformBars] = useState<number[]>([20, 35, 50, 70, 40, 60, 30, 80, 45, 60, 25, 40]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const audioAnalyserRef = useRef<AnalyserNode | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  // Audio player state
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioSpeed, setAudioSpeed] = useState<number>(1);
  const audioContextRef = useRef<AudioContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll messages to bottom on initial render and when messages update
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [activeMessages.length, activeConversation?.id]);

  const isGroup = activeConversation?.type === 'group';
  const partner = activeConversation?.participants[0] || {
    id: 'usr_partner',
    displayName: activeConversation?.title || 'Contato',
    avatarUrl: undefined,
    presence: { status: 'available' as const, customMessage: 'Online' }
  };

  // Real-time Typing Indicator State
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  // Helper to publish current typing status to Firestore
  const setMyTyping = async (isTyping: boolean) => {
    if (!currentUser || !activeConversation?.id) return;
    try {
      const typingRef = doc(db, 'conversations', activeConversation.id, 'typing', currentUser.id);
      await setDoc(typingRef, { isTyping, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      // Ignore silent errors if network/permissions are not active
    }
  };

  // Debounced typing publisher triggered on input text changes
  useEffect(() => {
    if (!currentUser || !activeConversation?.id) return;

    if (!inputText) {
      setMyTyping(false);
      return;
    }

    setMyTyping(true);

    const timeout = setTimeout(() => {
      setMyTyping(false);
    }, 2000);

    return () => clearTimeout(timeout);
  }, [inputText]);

  // Turn typing off when conversation changes or unmounts
  useEffect(() => {
    setMyTyping(false);
    return () => {
      setMyTyping(false);
    };
  }, [activeConversation?.id]);

  // Real-time subscription to partner's typing status
  useEffect(() => {
    if (!activeConversation?.id || !partner.id) return;

    const partnerTypingRef = doc(db, 'conversations', activeConversation.id, 'typing', partner.id);
    const unsubscribe = onSnapshot(partnerTypingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const lastUpdated = data.updatedAt ? new Date(data.updatedAt).getTime() : 0;
        // Expire typing status after 10 seconds of no heartbeat
        const isRecent = Date.now() - lastUpdated < 10000;
        setIsPartnerTyping(!!(data.isTyping && isRecent));
      } else {
        setIsPartnerTyping(false);
      }
    }, (error) => {
      console.warn('[Typing Indicator Listener error]:', error);
    });

    return () => unsubscribe();
  }, [activeConversation?.id, partner.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Scroll to bottom when partner starts typing
  useEffect(() => {
    if (isPartnerTyping) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isPartnerTyping]);

  // Voice recording timer
  useEffect(() => {
    if (isRecordingVoice && !isRecordingPaused) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecordingVoice, isRecordingPaused]);

  if (!activeConversation) return null;

  // Real or synthesized Voice Recording Handlers
  const startVoiceRecording = async () => {
    setIsRecordingVoice(true);
    setRecordingSeconds(0);
    setIsRecordingPaused(false);
    audioChunksRef.current = [];

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStreamRef.current = stream;

        // Web Audio Analyser for live dancing waveform
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioCtx = new AudioCtx();
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 64;
          source.connect(analyser);
          audioAnalyserRef.current = analyser;

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const updateLiveWaveform = () => {
            if (audioAnalyserRef.current) {
              audioAnalyserRef.current.getByteFrequencyData(dataArray);
              const bars: number[] = [];
              const step = Math.floor(dataArray.length / 12);
              for (let i = 0; i < 12; i++) {
                const val = dataArray[i * step] || 15;
                bars.push(Math.max(15, Math.min(95, Math.round((val / 255) * 100))));
              }
              setLiveWaveformBars(bars);
              animFrameIdRef.current = requestAnimationFrame(updateLiveWaveform);
            }
          };
          updateLiveWaveform();
        }

        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };
        recorder.start(100);
        mediaRecorderRef.current = recorder;
      }
    } catch (err) {
      console.info('Microfone real bloqueado ou em sandbox, usando captura de áudio com síntese SENDA:', err);
    }
  };

  const cleanupAudioRecording = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioAnalyserRef.current = null;
    clearInterval(recordingTimerRef.current);
  };

  const handleSendVoice = async () => {
    const duration = Math.max(1, recordingSeconds || 3);
    setIsRecordingVoice(false);
    cleanupAudioRecording();
    setRecordingSeconds(0);

    const recordedWaveform = [...liveWaveformBars];

    let audioUrl: string | undefined = undefined;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        await new Promise<void>((resolve) => {
          if (!mediaRecorderRef.current) return resolve();
          mediaRecorderRef.current.onstop = () => resolve();
          mediaRecorderRef.current.stop();
        });

        if (audioChunksRef.current.length > 0) {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const reader = new FileReader();
          const base64Audio = await new Promise<string>((resolve) => {
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(audioBlob);
          });

          // Upload audio to server to store as link URL
          try {
            const uploadRes = await fetch('/api/media/upload', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'audio', data: base64Audio })
            });
            const result = await uploadRes.json();
            if (result.success && result.url) {
              audioUrl = result.url;
            } else {
              audioUrl = base64Audio;
            }
          } catch {
            audioUrl = base64Audio;
          }
        }
      } catch (e) {
        console.warn('Erro ao processar áudio gravado:', e);
      }
    }

    const fallbackWaveform = [25, 45, 75, 95, 80, 60, 45, 70, 90, 85, 65, 40, 55, 30];
    await sendMessage(
      activeConversation.id,
      `Mensagem de voz criptografada (${duration}s)`,
      'audio',
      replyingTo?.id,
      {
        duration,
        waveform: recordedWaveform.length > 0 ? recordedWaveform : fallbackWaveform,
        url: audioUrl
      }
    );
    setReplyingTo(null);
  };

  const cancelVoiceRecording = () => {
    setIsRecordingVoice(false);
    cleanupAudioRecording();
    setRecordingSeconds(0);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    audioChunksRef.current = [];
  };

  // Image Upload Handler from device
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await processDeviceImageFile(file, 1280, 1280, 0.85);
      setPendingMedia(compressedDataUrl);
      setPendingMediaType('image');
    } catch (err) {
      console.warn('Erro ao processar imagem do dispositivo:', err);
    }
    e.target.value = '';
  };

  const handleCameraCapture = (mediaDataUrl: string, mediaType: 'image' | 'video') => {
    setPendingMedia(mediaDataUrl);
    setPendingMediaType(mediaType);
  };

  const handleSendText = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    // If there is a pending media attachment (photo or video captured/selected)
    if (pendingMedia && pendingMediaType) {
      const caption = inputText.trim() || (pendingMediaType === 'image' ? 'Fotografia compartilhada' : 'Vídeo compartilhado');
      const mediaData = pendingMedia;
      const mediaType = pendingMediaType;

      // Clear pending states immediately to keep the UI fluid and instant
      setPendingMedia(null);
      setPendingMediaType(null);
      setInputText('');
      const replyId = replyingTo?.id;
      setReplyingTo(null);

      // Perform secure upload via backend
      let finalMediaUrl = mediaData;
      try {
        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: mediaType, data: mediaData })
        });
        const result = await uploadRes.json();
        if (result.success && result.url) {
          finalMediaUrl = result.url;
        }
      } catch (err) {
        console.warn('[IndividualChatView] Backend media upload error, using local base64 fallback:', err);
      }

      await sendMessage(activeConversation.id, caption, mediaType, replyId, { url: finalMediaUrl });
      return;
    }

    if (!inputText.trim()) return;

    const textToSend = inputText.trim();
    setInputText('');
    const replyId = replyingTo?.id;
    setReplyingTo(null);

    await sendMessage(activeConversation.id, textToSend, 'text', replyId);
  };

  // Play audio simulation or real recorded voice audio
  const handleTogglePlayAudio = (msgId: string) => {
    // If clicking already playing audio, pause and reset
    if (playingAudioId === msgId) {
      if (activeAudioRef.current) {
        activeAudioRef.current.pause();
        activeAudioRef.current = null;
      }
      setPlayingAudioId(null);
      return;
    }

    // Stop any previously playing audio
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }

    const targetMsg = activeMessages.find((m) => m.id === msgId);
    setPlayingAudioId(msgId);

    // If message has real recorded audio (data:audio or https URL)
    if (targetMsg?.mediaUrl && (targetMsg.mediaUrl.startsWith('data:audio') || targetMsg.mediaUrl.startsWith('blob:') || targetMsg.mediaUrl.startsWith('http'))) {
      try {
        const audio = new Audio(targetMsg.mediaUrl);
        audio.playbackRate = audioSpeed;
        audio.onended = () => {
          setPlayingAudioId(null);
          activeAudioRef.current = null;
        };
        audio.onerror = () => {
          setPlayingAudioId(null);
          activeAudioRef.current = null;
        };
        activeAudioRef.current = audio;
        audio.play().catch(() => {
          // Playback gesture fallback
        });
        return;
      } catch (err) {
        console.warn('Erro ao reproduzir áudio real, usando sintetizador:', err);
      }
    }

    // Web Audio chime effect fallback
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch {
      // AudioCtx fallback
    }

    // Auto-stop fallback
    const dur = (targetMsg?.mediaDuration || 4) * 1000;
    setTimeout(() => {
      setPlayingAudioId((prev) => (prev === msgId ? null : prev));
    }, dur / audioSpeed);
  };

  // Delivery status renderer
  const renderDeliveryStatus = (status: MessageDeliveryStatus) => {
    switch (status) {
      case 'sending':
        return <span className="w-2.5 h-2.5 rounded-full border border-neutral-400 border-t-transparent animate-spin inline-block" title="Enviando" />;
      case 'sent':
        return <span title="Enviada"><Check className="w-3.5 h-3.5 text-neutral-400 dark:text-neutral-500" /></span>;
      case 'delivered':
        return (
          <div className="flex items-center text-neutral-400 dark:text-neutral-500" title="Entregue">
            <Check className="w-3.5 h-3.5" />
            <Check className="w-3.5 h-3.5 -ml-2.5" />
          </div>
        );
      case 'read':
        return (
          <div className="flex items-center text-sky-500 dark:text-sky-400" title="Lida">
            <Check className="w-3.5 h-3.5" />
            <Check className="w-3.5 h-3.5 -ml-2.5" />
          </div>
        );
      case 'failed':
        return <span className="text-[10px] text-rose-500 font-bold" title="Falha ao entregar">!</span>;
    }
  };

  const toggleSpeed = () => {
    if (audioSpeed === 1) setAudioSpeed(1.5);
    else if (audioSpeed === 1.5) setAudioSpeed(2);
    else setAudioSpeed(1);
  };

  // Quick Emoji reactions list
  const REACTION_EMOJIS = ['👍', '❤️', '🔥', '👏', '💡', '😂'];

  return (
    <div className="flex flex-col h-full min-h-0 w-full bg-neutral-50/50 dark:bg-[#0B0D0F] transition-colors duration-200 overflow-hidden">
      {/* Top Header */}
      <header className="h-16 px-4 sm:px-6 bg-white/95 dark:bg-[#121518]/95 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 z-20 sticky top-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className={`p-1.5 -ml-1 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer ${
              hideBackOnDesktop ? 'md:hidden' : ''
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Clickable Profile Header Trigger */}
          <div 
            id="chat-header-profile-trigger"
            onClick={() => setShowContactInfoModal(true)}
            className="flex items-center gap-3 min-w-0 cursor-pointer p-1.5 -m-1.5 rounded-xl hover:bg-neutral-100/80 dark:hover:bg-neutral-800/60 transition-all group select-none"
            title="Clique para ver o perfil e informações detalhadas"
          >
            {isGroup ? (
              <div className="w-9 h-9 rounded-full bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] flex items-center justify-center font-bold text-xs shrink-0 border border-[var(--senda-accent)]/30 group-hover:scale-105 transition-transform">
                <Users className="w-4 h-4" />
              </div>
            ) : (
              <div className="group-hover:scale-105 transition-transform shrink-0">
                <Avatar
                  name={partner.displayName}
                  src={partner.avatarUrl}
                  presence={partner.presence?.status}
                  size="sm"
                />
              </div>
            )}

            <div className="min-w-0 text-left">
              <div className="flex items-center gap-1.5">
                <h2 className="text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100 truncate group-hover:text-[var(--senda-accent)] transition-colors">
                  {activeConversation.title}
                </h2>
                {activeConversation.isBlocked && (
                  <span className="text-[10px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-semibold px-1.5 py-0.2 rounded-full shrink-0">
                    Bloqueado
                  </span>
                )}
                {activeConversation.isMuted && (
                  <span title="Silenciado" className="inline-flex shrink-0">
                    <BellOff className="w-3 h-3 text-amber-500" />
                  </span>
                )}
                {activeConversation.isArchived && (
                  <span title="Arquivado" className="inline-flex shrink-0">
                    <Archive className="w-3 h-3 text-blue-500" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {isGroup ? (
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                    {activeConversation.participants.map(p => p.displayName?.split(' ')[0] || '...').join(', ')}, Você
                  </p>
                ) : (
                  <>
                    <span className={`w-1.5 h-1.5 rounded-full ${PRESENCE_CONFIG[partner.presence?.status || 'available'].bg}`} />
                    <p className="text-[10px] text-neutral-500 dark:text-neutral-400 truncate">
                      {partner.presence?.customMessage || PRESENCE_CONFIG[partner.presence?.status || 'available'].label}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Audio call trigger */}
          {onStartCall && (
            <button
              type="button"
              onClick={() => onStartCall('audio')}
              title="Chamada de voz criptografada"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Phone className="w-4 h-4" />
            </button>
          )}

          {/* Video call trigger */}
          {onStartCall && (
            <button
              type="button"
              onClick={() => onStartCall('video')}
              title="Chamada de vídeo WebRTC"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <Video className="w-4 h-4" />
            </button>
          )}

          {/* Ephemeral Messages duration trigger */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEphemeralMenu(!showEphemeralMenu)}
              title="Mensagens Temporárias"
              className={`p-2 rounded-xl transition-colors cursor-pointer ${
                activeConversation.ephemeralDuration && activeConversation.ephemeralDuration > 0
                  ? 'text-[var(--senda-accent)] bg-[var(--senda-accent-subtle)]'
                  : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800'
              }`}
            >
              <Clock className="w-4 h-4" />
            </button>

            {showEphemeralMenu && (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-xl bg-white dark:bg-[#1A1D21] border border-neutral-200 dark:border-neutral-800 shadow-xl p-2 text-xs space-y-1">
                <p className="px-2 py-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  Mensagens Autodestrutivas
                </p>
                {[
                  { label: 'Desativadas', sec: 0 },
                  { label: '30 segundos (Demo)', sec: 30 },
                  { label: '1 hora', sec: 3600 },
                  { label: '24 horas', sec: 86400 },
                  { label: '7 dias', sec: 604800 },
                ].map((item) => (
                  <button
                    key={item.sec}
                    type="button"
                    onClick={() => {
                      setEphemeralDuration(activeConversation.id, item.sec);
                      setShowEphemeralMenu(false);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center justify-between cursor-pointer ${
                      (activeConversation.ephemeralDuration || 0) === item.sec
                        ? 'bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] font-semibold'
                        : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span>{item.label}</span>
                    {(activeConversation.ephemeralDuration || 0) === item.sec && (
                      <Check className="w-3.5 h-3.5" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Safety Number & E2EE trigger */}
          <button
            type="button"
            onClick={() => setShowSafetyModal(true)}
            title="Verificar Criptografia Ponta a Ponta"
            className="p-2 rounded-xl text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4" />
          </button>

          {/* More options menu in Chat View (Silenciar, Bloquear, Arquivar, Ver Perfil) */}
          <div className="relative">
            <button
              type="button"
              id="chat-header-more-options-btn"
              onClick={() => setShowChatOptionsMenu(!showChatOptionsMenu)}
              title="Opções da conversa"
              className="p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showChatOptionsMenu && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-11 z-30 w-52 rounded-xl bg-white dark:bg-[#1A1D21] border border-neutral-200 dark:border-neutral-800 shadow-xl p-1.5 text-xs space-y-0.5 animate-in fade-in"
              >
                <button
                  type="button"
                  id="chat-menu-view-profile"
                  onClick={() => {
                    setShowContactInfoModal(true);
                    setShowChatOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                >
                  <Info className="w-4 h-4 text-neutral-400" />
                  <span>Ver perfil e dados</span>
                </button>

                <button
                  type="button"
                  id="chat-menu-toggle-mute"
                  onClick={() => {
                    toggleMute(activeConversation.id);
                    setShowChatOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                >
                  {activeConversation.isMuted ? <Bell className="w-4 h-4 text-amber-500" /> : <BellOff className="w-4 h-4 text-neutral-400" />}
                  <span>{activeConversation.isMuted ? 'Reativar som' : 'Silenciar notificações'}</span>
                </button>

                <button
                  type="button"
                  id="chat-menu-toggle-archive"
                  onClick={() => {
                    toggleArchive(activeConversation.id);
                    setShowChatOptionsMenu(false);
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-left cursor-pointer"
                >
                  {activeConversation.isArchived ? <ArchiveRestore className="w-4 h-4 text-blue-500" /> : <Archive className="w-4 h-4 text-neutral-400" />}
                  <span>{activeConversation.isArchived ? 'Desarquivar conversa' : 'Arquivar conversa'}</span>
                </button>

                {!isGroup && (
                  <button
                    type="button"
                    id="chat-menu-toggle-block"
                    onClick={() => {
                      toggleBlock(activeConversation.id);
                      setShowChatOptionsMenu(false);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-left cursor-pointer"
                  >
                    {activeConversation.isBlocked ? <Ban className="w-4 h-4 text-rose-500" /> : <UserX className="w-4 h-4 text-neutral-400" />}
                    <span>{activeConversation.isBlocked ? 'Desbloquear contato' : 'Bloquear contato'}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Ephemeral Banner if active */}
      {activeConversation.ephemeralDuration && activeConversation.ephemeralDuration > 0 ? (
        <div className="bg-[var(--senda-accent-subtle)] px-4 py-1.5 border-b border-[var(--senda-accent)]/15 text-center text-[11px] text-[var(--senda-accent)] font-medium flex items-center justify-center gap-1.5">
          <Clock className="w-3.5 h-3.5 animate-spin" />
          <span>
            Mensagens temporárias ativas: expiram em {
              activeConversation.ephemeralDuration < 60 
                ? `${activeConversation.ephemeralDuration}s` 
                : `${activeConversation.ephemeralDuration / 3600}h`
            } após envio
          </span>
        </div>
      ) : null}

      {/* Virtualized Chat Messages Body */}
      <VirtualizedMessageList
        messages={activeMessages}
        currentUserId={currentUser?.id}
        isGroup={isGroup}
        isPartnerTyping={isPartnerTyping}
        partner={partner}
        conversationId={activeConversation.id}
        activeReactionMsgId={activeReactionMsgId}
        onToggleReaction={(id) => setActiveReactionMsgId(id)}
        onSelectReaction={(msgId, emoji) => toggleReaction(activeConversation.id, msgId, emoji)}
        onReply={(msg) => setReplyingTo(msg)}
        onOpenLightbox={(url) => setLightboxImage(url)}
        playingAudioId={playingAudioId}
        onTogglePlayAudio={handleTogglePlayAudio}
        audioSpeed={audioSpeed}
        onToggleAudioSpeed={toggleSpeed}
      />

      {/* Reply Banner preview above input */}
      {replyingTo && (
        <div className="px-4 py-2 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2 shrink-0 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1 h-8 rounded-full bg-[var(--senda-accent)] shrink-0" />
            <div className="text-xs truncate">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                Respondendo a {replyingTo.senderName}:
              </span>
              <p className="text-neutral-500 truncate">{replyingTo.decryptedContent}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Media Attachment Preview Bar before sending */}
      {pendingMedia && (
        <div className="px-4 py-2.5 bg-neutral-100 dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-3 shrink-0 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 rounded-lg overflow-hidden border border-neutral-300 dark:border-neutral-700 bg-black flex items-center justify-center shrink-0">
              {pendingMediaType === 'image' ? (
                <img src={pendingMedia} alt="Anexo" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-neutral-950">
                  <Video className="w-5 h-5 text-[var(--senda-accent)]" />
                </div>
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                {pendingMediaType === 'image' ? 'Imagem pronta para envio' : 'Vídeo pronto para envio'}
              </p>
              <p className="text-[10px] text-neutral-500">Adicione uma legenda abaixo ou envie diretamente</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setPendingMedia(null);
              setPendingMediaType(null);
            }}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-500 hover:bg-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
            title="Remover anexo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Hidden File Input for Image Attachments */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Message Input Bottom Bar with Voice Note recording capability */}
      <div className="p-3 bg-white/90 dark:bg-[#121518]/90 backdrop-blur-md border-t border-neutral-200/80 dark:border-neutral-800 shrink-0">
        {activeConversation.isBlocked ? (
          <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 rounded-2xl border border-rose-200 dark:border-rose-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left animate-in fade-in">
            <div className="flex items-center gap-2.5 text-rose-800 dark:text-rose-300">
              <Ban className="w-5 h-5 shrink-0 text-rose-600 dark:text-rose-400" />
              <p className="text-xs font-semibold">
                Este contato está bloqueado. Você não receberá mensagens nem pode enviar mensagens a ele.
              </p>
            </div>
            <button
              type="button"
              id="unblock-chat-bottom-btn"
              onClick={() => toggleBlock(activeConversation.id)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shrink-0 cursor-pointer shadow-xs transition-colors"
            >
              Desbloquear Contato
            </button>
          </div>
        ) : isRecordingVoice ? (
          /* Live Voice-Note Recording Console */
          <div className="flex items-center justify-between gap-3 bg-neutral-100/95 dark:bg-neutral-900/95 border border-neutral-200/80 dark:border-neutral-800 rounded-2xl p-2.5 px-4 animate-in fade-in slide-in-from-bottom-2 shadow-xs">
            {/* Live Indicator & Timer */}
            <div className="flex items-center gap-3 min-w-0">
              <span className={`w-3 h-3 rounded-full ${isRecordingPaused ? 'bg-amber-500' : 'bg-rose-500 animate-ping'} shrink-0`} />
              <div className="flex flex-col">
                <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100 leading-none">
                  0:{recordingSeconds.toString().padStart(2, '0')}
                </span>
                <span className="text-[10px] text-neutral-500 truncate mt-0.5">
                  {isRecordingPaused ? 'Gravação pausada' : 'Gravando áudio seguro...'}
                </span>
              </div>

              {/* Dynamic Equalizer Visualizer Bars */}
              {!isRecordingPaused && (
                <div className="hidden sm:flex items-center gap-1 h-6 px-2 bg-neutral-200/50 dark:bg-neutral-800/50 rounded-lg">
                  {liveWaveformBars.map((level, i) => (
                    <div
                      key={i}
                      className="w-1 bg-[var(--senda-accent)] rounded-full transition-all duration-75"
                      style={{ height: `${Math.max(4, Math.round(level * 0.22))}px` }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Recording Controls: Cancel, Pause/Resume, Send */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="voice-note-cancel-button"
                type="button"
                onClick={cancelVoiceRecording}
                className="p-2 rounded-xl text-neutral-500 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                title="Descartar gravação de voz"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <button
                id="voice-note-pause-resume-button"
                type="button"
                onClick={() => setIsRecordingPaused(!isRecordingPaused)}
                className="px-3 py-1.5 rounded-xl text-xs bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium hover:bg-neutral-300 dark:hover:bg-neutral-700 transition-colors cursor-pointer"
              >
                {isRecordingPaused ? 'Continuar' : 'Pausar'}
              </button>

              <button
                id="voice-note-send-button"
                type="button"
                onClick={handleSendVoice}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[var(--senda-accent)] hover:bg-[var(--senda-accent-hover)] text-white text-xs font-semibold shadow-xs active:scale-95 transition-all cursor-pointer"
                title="Enviar mensagem de voz"
              >
                <span>Enviar</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ) : (
          /* Normal Text, Media & Voice Note Input Form */
          <form onSubmit={handleSendText} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCameraOpen(true)}
              title="Tirar foto com a câmera"
              className="p-2.5 rounded-xl text-neutral-500 hover:text-[var(--senda-accent)] hover:bg-[var(--senda-accent-subtle)] transition-colors shrink-0 cursor-pointer"
            >
              <Camera className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="Escolher foto do dispositivo"
              className="p-2.5 rounded-xl text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
            >
              <Paperclip className="w-5 h-5" />
            </button>

            {/* Quick mic trigger if text is typed */}
            {inputText.trim() && (
              <button
                type="button"
                onClick={startVoiceRecording}
                title="Gravar mensagem de voz"
                className="p-2.5 rounded-xl text-neutral-500 hover:text-[var(--senda-accent)] hover:bg-[var(--senda-accent-subtle)] transition-colors shrink-0 cursor-pointer"
              >
                <Mic className="w-5 h-5" />
              </button>
            )}

            <div className="flex-1 relative flex items-center">
              <input
                type="text"
                placeholder={
                  pendingMedia 
                    ? `Escreva uma legenda para o ${pendingMediaType === 'image' ? 'anexo' : 'vídeo'}...` 
                    : t('conversations.typeMessage', 'Escreva uma mensagem encriptada...')
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="w-full bg-neutral-100/90 dark:bg-neutral-900/90 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 rounded-xl px-4 py-2.5 border border-neutral-200/80 dark:border-neutral-800 focus:outline-none focus:border-[var(--senda-accent)] transition-all"
              />
            </div>

            {inputText.trim() || pendingMedia ? (
              <button
                id="send-text-message-button"
                type="submit"
                className="p-2.5 rounded-xl bg-[var(--senda-accent)] hover:bg-[var(--senda-accent-hover)] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer"
                title="Enviar mensagem de texto"
              >
                <Send className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="voice-note-record-button"
                type="button"
                onClick={startVoiceRecording}
                title="Gravar mensagem de voz"
                className="p-2.5 rounded-xl bg-[var(--senda-accent)] hover:bg-[var(--senda-accent-hover)] text-white shadow-xs active:scale-95 transition-all shrink-0 cursor-pointer group"
              >
                <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </button>
            )}
          </form>
        )}
      </div>

      {/* Lightbox for clicked image in chat */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setLightboxImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              type="button"
              onClick={() => setLightboxImage(null)}
              className="absolute -top-12 right-0 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
              title="Fechar"
            >
              <X className="w-5 h-5" />
            </button>
            <img 
              src={lightboxImage} 
              alt="Visualização em tela cheia" 
              className="max-h-[85vh] w-auto object-contain rounded-xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}

      {/* Safety Number / Security Modal */}
      {showSafetyModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowSafetyModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Verificar Número de Segurança</h3>
                  <p className="text-xs text-neutral-500">Criptografia E2EE ponto a ponto</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowSafetyModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              Compare este código de 60 dígitos ou escaneie o código com o dispositivo de <strong>{activeConversation.title}</strong> para garantir autenticidade criptográfica ponta a ponta.
            </p>

            {/* Simulated QR Code for Safety Fingerprint */}
            <div className="p-4 bg-white rounded-xl border border-neutral-200 flex flex-col items-center">
              <svg width="140" height="140" viewBox="0 0 100 100" fill="none" className="text-neutral-900">
                <rect width="100" height="100" fill="white" />
                <rect x="10" y="10" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                <rect x="16" y="16" width="12" height="12" fill="currentColor" />
                <rect x="66" y="10" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                <rect x="72" y="16" width="12" height="12" fill="currentColor" />
                <rect x="10" y="66" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                <rect x="16" y="72" width="12" height="12" fill="currentColor" />
                <rect x="42" y="14" width="6" height="6" fill="currentColor" />
                <rect x="54" y="24" width="6" height="6" fill="currentColor" />
                <rect x="44" y="44" width="12" height="12" fill="#10B981" />
                <rect x="64" y="64" width="6" height="6" fill="currentColor" />
                <rect x="42" y="74" width="6" height="6" fill="currentColor" />
              </svg>
            </div>

            {/* 60 digits display */}
            <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-center text-xs tracking-wider text-neutral-800 dark:text-neutral-200 leading-loose select-all">
              {activeConversation.safetyNumber || '48192 01847 99201 44820 91823 48102 94810 29381 02938 10293 84710 29384'}
            </div>

            <Button
              variant="secondary"
              size="md"
              className="w-full"
              leftIcon={copiedFingerprint ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              onClick={() => {
                navigator.clipboard?.writeText(activeConversation.safetyNumber || '');
                setCopiedFingerprint(true);
                setTimeout(() => setCopiedFingerprint(false), 2000);
              }}
            >
              {copiedFingerprint ? 'Número Copiado' : 'Copiar Código de Segurança'}
            </Button>
          </div>
        </div>
      )}
      {/* Camera Capture Modal for Direct Photos or Videos from Device */}
      <DeviceCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Capturar Foto ou Vídeo"
      />

      {/* Detailed Contact / Group Profile Modal */}
      <ContactInfoModal
        isOpen={showContactInfoModal}
        onClose={() => setShowContactInfoModal(false)}
        conversation={activeConversation}
        onStartCall={onStartCall}
      />
    </div>
  );
};
