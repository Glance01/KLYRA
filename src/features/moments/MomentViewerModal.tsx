import React, { useState, useEffect, useRef } from 'react';
import { SendaMoment } from '../../types';
import { Avatar } from '../../components/ds/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../context/ConversationContext';
import { 
  X, 
  Heart, 
  Flame, 
  Send, 
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  MapPin, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Sparkles,
  Shield,
  Trash2
} from 'lucide-react';

interface MomentViewerModalProps {
  moments: SendaMoment[];
  initialIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onLikeMoment: (id: string) => void;
  onViewMoment?: (id: string) => void;
  onDeleteMoment?: (id: string) => void;
  onReplySuccess?: (authorName: string) => void;
}

export const MomentViewerModal: React.FC<MomentViewerModalProps> = ({
  moments,
  initialIndex,
  isOpen,
  onClose,
  onLikeMoment,
  onViewMoment,
  onDeleteMoment,
  onReplySuccess
}) => {
  const { currentUser } = useAuth();
  const { conversations, sendMessage, selectConversation } = useConversations();

  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sentToast, setSentToast] = useState(false);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; left: number }[]>([]);
  const [now, setNow] = useState<number>(Date.now());

  const DURATION_PER_STORY_MS = 6000;
  const currentMoment = moments[currentIndex] || moments[0];

  // Ticker for real live countdown display
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const formatRemainingTime = (m: SendaMoment) => {
    if (!m) return '';
    const createdMs = m.createdTimestamp || (now - 3600 * 1000);
    const expiresMs = m.expiresAtMs || (createdMs + m.expiresInHours * 3600 * 1000);
    const remainingMs = Math.max(0, expiresMs - now);

    const totalSecs = Math.floor(remainingMs / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    if (hours > 0) {
      return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
    }
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  const isAuthor = Boolean(
    currentUser &&
    currentMoment &&
    (currentMoment.author.id === currentUser.id ||
      currentMoment.author.username === currentUser.username ||
      currentMoment.author.displayName === currentUser.displayName ||
      currentUser.id === 'usr_me')
  );

  const handleDeleteCurrentMoment = () => {
    if (!currentMoment || !onDeleteMoment) return;
    const targetId = currentMoment.id;
    onDeleteMoment(targetId);

    if (moments.length > 1) {
      if (currentIndex >= moments.length - 1) {
        setCurrentIndex((prev) => Math.max(0, prev - 1));
      }
      setProgress(0);
    } else {
      onClose();
    }
  };

  // Sync initialIndex when opened
  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setProgress(0);
      setIsPaused(false);
      setIsPlayingAudio(false);
    }
  }, [isOpen, initialIndex]);

  // Track single account view count
  useEffect(() => {
    if (isOpen && currentMoment && onViewMoment) {
      onViewMoment(currentMoment.id);
    }
  }, [isOpen, currentIndex, currentMoment?.id, onViewMoment]);

  // Story progress timer
  useEffect(() => {
    if (!isOpen || isPaused || !currentMoment) return;

    const stepMs = 50;
    const increment = (stepMs / DURATION_PER_STORY_MS) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          // Advance to next or close if last
          if (currentIndex < moments.length - 1) {
            setCurrentIndex((idx) => idx + 1);
            return 0;
          } else {
            onClose();
            return 100;
          }
        }
        return prev + increment;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [isOpen, isPaused, currentIndex, moments.length, currentMoment, onClose]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') handleNext();
      else if (e.key === 'ArrowLeft') handlePrev();
      else if (e.key === ' ') setIsPaused((p) => !p);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentIndex, moments.length]);

  if (!isOpen || !currentMoment) return null;

  const handleNext = () => {
    if (currentIndex < moments.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setProgress(0);
      setIsPlayingAudio(false);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setProgress(0);
      setIsPlayingAudio(false);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    onLikeMoment(currentMoment.id);

    // Floating reaction animation
    const id = Date.now() + Math.random();
    const left = 30 + Math.random() * 40;
    setFloatingEmojis((prev) => [...prev, { id, emoji, left }]);

    setTimeout(() => {
      setFloatingEmojis((prev) => prev.filter((item) => item.id !== id));
    }, 1500);
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !currentUser) return;

    // Find or target conversation with the moment author
    const authorUsername = currentMoment.author.username;
    let targetConv = conversations.find((c) =>
      c.participants.some((p) => p.username === authorUsername)
    );

    const messageContent = `💬 Respondeu ao seu momento ("${currentMoment.content.slice(0, 45)}..."): ${replyText.trim()}`;

    if (targetConv) {
      await sendMessage(targetConv.id, messageContent, 'text');
    } else if (conversations.length > 0) {
      // Fallback to first active conversation for demo
      await sendMessage(conversations[0].id, messageContent, 'text');
    }

    setReplyText('');
    setSentToast(true);
    if (onReplySuccess) onReplySuccess(currentMoment.author.displayName);

    setTimeout(() => {
      setSentToast(false);
    }, 2500);
  };

  return (
    <div 
      id="moment-viewer-overlay"
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200"
      onMouseDown={() => setIsPaused(true)}
      onMouseUp={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Floating Emojis Animation Layer */}
      {floatingEmojis.map((f) => (
        <div
          key={f.id}
          className="pointer-events-none absolute bottom-24 text-4xl animate-bounce transition-all duration-1000 z-50"
          style={{ left: `${f.left}%`, transform: 'translateY(-120px)', opacity: 0.9 }}
        >
          {f.emoji}
        </div>
      ))}

      {/* Main Story Container (9:16 mobile aspect ratio style) */}
      <div 
        className="relative w-full max-w-md h-full sm:h-[88vh] sm:max-h-[820px] sm:rounded-3xl overflow-hidden bg-neutral-900 text-white flex flex-col justify-between shadow-2xl border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Visual Layer */}
        {currentMoment.type === 'photo' && currentMoment.mediaUrl ? (
          <div className="absolute inset-0 z-0">
            <img
              src={currentMoment.mediaUrl}
              alt="Momento"
              className="w-full h-full object-cover brightness-90"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/20 to-black/80" />
          </div>
        ) : (
          <div 
            className="absolute inset-0 z-0 transition-colors duration-500"
            style={{
              background: currentMoment.accentColor 
                ? `linear-gradient(135deg, ${currentMoment.accentColor}33 0%, #121518 100%)` 
                : 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
            }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/5 to-transparent" />
          </div>
        )}

        {/* TOP CONTROLS: Segmented Progress Bars & Author Info */}
        <div className="relative z-20 p-4 sm:p-5 space-y-3 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          {/* Progress Bars Segments */}
          <div className="flex items-center gap-1.5 w-full">
            {moments.map((m, idx) => {
              const isCurrent = idx === currentIndex;
              const isPast = idx < currentIndex;
              return (
                <div 
                  key={m.id}
                  className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden cursor-pointer"
                  onClick={() => {
                    setCurrentIndex(idx);
                    setProgress(0);
                  }}
                >
                  <div
                    className="h-full bg-white transition-all duration-100 ease-linear rounded-full"
                    style={{
                      width: isPast ? '100%' : isCurrent ? `${progress}%` : '0%'
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Author info header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar
                name={currentMoment.author.displayName}
                src={currentMoment.author.avatarUrl}
                presence={currentMoment.author.presence?.status}
                size="sm"
                className="ring-2 ring-white/30"
              />
              <div className="text-left">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-tight text-white drop-shadow-xs">
                    {currentMoment.author.displayName}
                  </h3>
                  <span className="text-[11px] text-white/70">
                    {currentMoment.createdAt}
                  </span>
                </div>
                {currentMoment.locationName && (
                  <p className="text-[11px] text-white/80 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-[var(--senda-accent,#3B82F6)]" />
                    <span>{currentMoment.locationName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons (Timer, Author Delete, Close) */}
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1 text-[11px] font-mono font-medium bg-black/40 backdrop-blur-md border border-white/20 px-2.5 py-1 rounded-full text-amber-300 shadow-xs">
                <Clock className="w-3 h-3 text-amber-400 animate-pulse" />
                <span>Expira em {formatRemainingTime(currentMoment)}</span>
              </div>

              {isAuthor && onDeleteMoment && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCurrentMoment();
                  }}
                  className="p-1.5 rounded-full bg-red-600/80 hover:bg-red-600 backdrop-blur-md text-white transition-all cursor-pointer shadow-md hover:scale-105 active:scale-95"
                  title="Eliminar este momento (Autor)"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                type="button"
                id="story-close-btn"
                onClick={onClose}
                className="p-1.5 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
                title="Fechar (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* TAP NAVIGATION ZONES (Left to Previous, Right to Next) */}
        <div className="relative z-10 flex-1 flex items-center justify-between px-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className={`w-1/4 h-full flex items-center justify-start opacity-0 hover:opacity-100 transition-opacity p-2 text-white/60 ${
              currentIndex === 0 ? 'pointer-events-none' : 'cursor-pointer'
            }`}
            title="Momento anterior"
          >
            <ChevronLeft className="w-8 h-8 drop-shadow-md" />
          </button>

          {/* CENTER STORY CONTENT DISPLAY */}
          <div className="flex-1 max-w-xs text-center px-4 py-8 space-y-4">
            {currentMoment.type === 'thought' ? (
              <div className="space-y-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-white/10 flex items-center justify-center text-white/80">
                  <Sparkles className="w-5 h-5" />
                </div>
                <blockquote className="text-xl sm:text-2xl font-serif tracking-tight leading-relaxed text-white drop-shadow-md">
                  "{currentMoment.content}"
                </blockquote>
              </div>
            ) : currentMoment.type === 'audio' ? (
              <div className="p-6 rounded-2xl bg-black/40 backdrop-blur-md border border-white/15 space-y-4 text-center">
                <div className="w-14 h-14 mx-auto rounded-full bg-[var(--senda-accent,#3B82F6)] flex items-center justify-center text-white shadow-lg">
                  <Volume2 className="w-7 h-7" />
                </div>

                <p className="text-sm font-medium text-white/90">
                  {currentMoment.content}
                </p>

                {/* Animated Waveform Bars */}
                <div className="flex items-center justify-center gap-1.5 h-10 py-1">
                  {(currentMoment.audioWaveform || [30, 60, 90, 45, 75, 100, 80, 50, 65, 30]).map((h, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-white transition-all animate-pulse"
                      style={{ 
                        height: `${Math.max(12, h * 0.35)}px`,
                        animationDelay: `${i * 100}ms`
                      }}
                    />
                  ))}
                </div>

                <p className="text-xs font-mono text-white/60">
                  0:{currentMoment.audioDuration?.toString().padStart(2, '0') || '18'} de áudio efêmero
                </p>
              </div>
            ) : (
              /* Photo Caption */
              currentMoment.content && (
                <div className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 inline-block text-left">
                  <p className="text-sm sm:text-base font-medium text-white drop-shadow-md">
                    {currentMoment.content}
                  </p>
                </div>
              )
            )}
          </div>

          <button
            type="button"
            onClick={handleNext}
            className="w-1/4 h-full flex items-center justify-end opacity-0 hover:opacity-100 transition-opacity p-2 text-white/60 cursor-pointer"
            title="Próximo momento"
          >
            <ChevronRight className="w-8 h-8 drop-shadow-md" />
          </button>
        </div>

        {/* BOTTOM SECTION: Quick Reactions & Direct Reply */}
        <div className="relative z-20 p-4 sm:p-5 space-y-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
          {/* Quick Reaction Emojis Pill Bar */}
          <div className="flex items-center justify-center gap-2">
            {[
              { emoji: '❤️', label: 'Coração' },
              { emoji: '🔥', label: 'Fogo' },
              { emoji: '👏', label: 'Palmas' },
              { emoji: '😮', label: 'Surpreso' },
              { emoji: '😂', label: 'Riso' },
              { emoji: '💡', label: 'Inspiração' },
            ].map((item) => (
              <button
                key={item.emoji}
                type="button"
                onClick={() => handleQuickReaction(item.emoji)}
                className="w-9 h-9 rounded-full bg-white/15 hover:bg-white/30 backdrop-blur-md flex items-center justify-center text-lg hover:scale-125 active:scale-95 transition-all cursor-pointer shadow-xs"
                title={item.label}
              >
                {item.emoji}
              </button>
            ))}

            {/* Like Counter Badge (Interactive Toggle) */}
            <button
              type="button"
              onClick={() => onLikeMoment(currentMoment.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-bold text-white cursor-pointer select-none"
              title="Curtir / Retirar curtida"
            >
              <Heart 
                className={`w-4 h-4 transition-colors ${
                  currentUser && currentMoment.likedBy?.includes(currentUser.id) 
                    ? 'fill-rose-500 text-rose-500 scale-110' 
                    : 'text-white'
                }`} 
              />
              <span>{currentMoment.likesCount}</span>
            </button>
          </div>

          {/* Reply form input */}
          <form onSubmit={handleSendReply} className="relative flex items-center gap-2">
            <input
              type="text"
              placeholder={`Responder a ${currentMoment.author.displayName}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onFocus={() => setIsPaused(true)}
              onBlur={() => setIsPaused(false)}
              className="flex-1 bg-white/15 focus:bg-white/25 backdrop-blur-md text-sm text-white placeholder:text-white/60 px-4 py-2.5 rounded-2xl border border-white/20 focus:outline-none focus:border-white/50 transition-all"
            />
            {replyText.trim() && (
              <button
                type="submit"
                className="p-2.5 rounded-xl bg-[var(--senda-accent,#3B82F6)] hover:opacity-90 text-white shadow-md active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            )}
          </form>

          {/* Sent Toast Notification */}
          {sentToast && (
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-in fade-in duration-150">
              <Shield className="w-3.5 h-3.5" />
              <span>Resposta enviada de forma privada!</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
