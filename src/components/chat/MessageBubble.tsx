import React from 'react';
import { SendaMessage, MessageDeliveryStatus } from '../../types';
import { 
  Play, 
  Pause, 
  Maximize2, 
  Clock, 
  Reply, 
  Check, 
  CheckCheck 
} from 'lucide-react';

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🔒'];

interface MessageBubbleProps {
  msg: SendaMessage;
  isMe: boolean;
  isGroup: boolean;
  currentUserId?: string;
  showReactions: boolean;
  onToggleReactions: () => void;
  onSelectReaction: (emoji: string) => void;
  onReply: (msg: SendaMessage) => void;
  onOpenLightbox: (url: string) => void;
  playingAudioId: string | null;
  onTogglePlayAudio: (id: string) => void;
  audioSpeed: number;
  onToggleAudioSpeed: () => void;
  onMeasure?: () => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = React.memo(({
  msg,
  isMe,
  isGroup,
  currentUserId,
  showReactions,
  onToggleReactions,
  onSelectReaction,
  onReply,
  onOpenLightbox,
  playingAudioId,
  onTogglePlayAudio,
  audioSpeed,
  onToggleAudioSpeed
}) => {
  const renderDeliveryStatus = (status?: MessageDeliveryStatus) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-neutral-400 animate-pulse" />;
      case 'sent':
        return <Check className="w-3 h-3 text-neutral-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-neutral-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-[var(--senda-accent)]" />;
      default:
        return <CheckCheck className="w-3 h-3 text-neutral-400" />;
    }
  };

  return (
    <div
      id={`msg-container-${msg.id}`}
      className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative select-text px-3 py-1.5`}
    >
      {/* Group sender name badge if in group and not me */}
      {isGroup && !isMe && msg.senderId !== 'system' && (
        <span className="text-[10px] font-semibold text-neutral-500 ml-2 mb-0.5">
          {msg.senderName}
        </span>
      )}

      {/* Reply Reference if exists */}
      {msg.replyTo && (
        <div 
          className={`text-[10px] text-neutral-400 mb-1 px-2.5 py-1 rounded-t-lg bg-neutral-200/50 dark:bg-neutral-800/40 border-l-2 border-[var(--senda-accent)] max-w-[80%] truncate ${isMe ? 'mr-1' : 'ml-1'}`}
        >
          <span className="font-semibold text-neutral-600 dark:text-neutral-300">{msg.replyTo.senderName}:</span> {msg.replyTo.text}
        </div>
      )}

      {/* Message Bubble Card */}
      <div
        id={`msg-bubble-${msg.id}`}
        onClick={onToggleReactions}
        className={`relative max-w-[85%] sm:max-w-[75%] p-3 text-sm transition-all cursor-pointer ${
          isMe
            ? 'bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)]/30 text-neutral-900 dark:text-neutral-100 shadow-xs'
            : 'bg-white dark:bg-[#14171A] border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-neutral-100 shadow-xs'
        }`}
        style={{ borderRadius: 'var(--app-radius, 14px)' }}
      >
        {/* Voice Audio Message Layout */}
        {msg.type === 'audio' ? (
          <div className="flex items-center gap-3 py-1 min-w-[220px]">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onTogglePlayAudio(msg.id);
              }}
              className="w-10 h-10 rounded-full bg-[var(--senda-accent)] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:opacity-90 active:scale-95 transition-transform"
            >
              {playingAudioId === msg.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            {/* Waveform graphic */}
            <div className="flex-1 flex items-center gap-1 h-7">
              {(msg.waveform || [30, 50, 80, 60, 90, 40, 70, 50, 30]).map((h, i) => (
                <div
                  key={i}
                  className={`w-1 rounded-full transition-all ${
                    playingAudioId === msg.id ? 'bg-[var(--senda-accent)] animate-pulse' : 'bg-neutral-300 dark:bg-neutral-700'
                  }`}
                  style={{ height: `${Math.max(12, h * 0.28)}px` }}
                />
              ))}
            </div>

            {/* Audio Speed Selector */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleAudioSpeed();
              }}
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-200/70 dark:bg-neutral-800 font-semibold text-neutral-700 dark:text-neutral-300 hover:opacity-80"
            >
              {audioSpeed}x
            </button>
          </div>
        ) : msg.type === 'image' && msg.mediaUrl ? (
          /* Image Attachment Layout */
          <div className="space-y-2">
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (msg.mediaUrl) onOpenLightbox(msg.mediaUrl);
              }}
              className="rounded-xl overflow-hidden max-h-64 bg-neutral-100 dark:bg-neutral-800 cursor-zoom-in relative group/img"
            >
              <img
                src={msg.mediaUrl}
                alt="Mídia"
                className="w-full h-full object-cover group-hover/img:scale-102 transition-transform duration-200"
                referrerPolicy="no-referrer"
              />
              <span className="absolute bottom-2 right-2 p-1 rounded-lg bg-black/50 text-white opacity-0 group-hover/img:opacity-100 transition-opacity">
                <Maximize2 className="w-3.5 h-3.5" />
              </span>
            </div>
            {msg.decryptedContent && (
              <p className="text-xs leading-relaxed">{msg.decryptedContent}</p>
            )}
          </div>
        ) : msg.type === 'video' && msg.mediaUrl ? (
          /* Video Attachment Layout */
          <div className="space-y-2 max-w-sm">
            <div className="rounded-xl overflow-hidden max-h-64 bg-black relative">
              <video
                src={msg.mediaUrl}
                controls
                playsInline
                className="w-full h-full max-h-64 object-cover"
              />
            </div>
            {msg.decryptedContent && (
              <p className="text-xs leading-relaxed">{msg.decryptedContent}</p>
            )}
          </div>
        ) : (
          /* Standard Plain Text */
          <p className="leading-relaxed break-words">{msg.decryptedContent}</p>
        )}

        {/* Footer details: timestamp, ephemeral indicator and status */}
        <div className="flex items-center justify-end gap-1.5 mt-1.5 pt-0.5 text-neutral-400 select-none">
          {msg.isEphemeral && (
            <span className="text-[10px] flex items-center gap-0.5 text-amber-500 font-medium">
              <Clock className="w-2.5 h-2.5" />
              <span>efêmera</span>
            </span>
          )}
          <span className="text-[10px] font-mono">{msg.timestamp}</span>
          {isMe && renderDeliveryStatus(msg.status)}
        </div>

        {/* Reaction list pills below bubble */}
        {msg.reactions && msg.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {msg.reactions.map((r) => (
              <button
                key={r.emoji}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectReaction(r.emoji);
                }}
                className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 border transition-colors cursor-pointer ${
                  currentUserId && r.users.includes(currentUserId)
                    ? 'bg-[var(--senda-accent-subtle)] border-[var(--senda-accent)] text-[var(--senda-accent)]'
                    : 'bg-neutral-100 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                }`}
              >
                <span>{r.emoji}</span>
                <span className="font-mono text-[9px]">{r.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Floating Reaction Bar when message is clicked */}
      {showReactions && (
        <div 
          className={`flex items-center gap-1 p-1 bg-white dark:bg-[#1A1D21] border border-neutral-200 dark:border-neutral-800 rounded-full shadow-lg z-10 mt-1 animate-in fade-in zoom-in-95 ${
            isMe ? 'self-end mr-1' : 'self-start ml-1'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onSelectReaction(emoji);
                onToggleReactions();
              }}
              className="w-7 h-7 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center justify-center text-sm hover:scale-125 transition-transform cursor-pointer"
            >
              {emoji}
            </button>
          ))}
          <div className="w-[1px] h-4 bg-neutral-200 dark:bg-neutral-800 mx-0.5" />
          <button
            type="button"
            onClick={() => {
              onReply(msg);
              onToggleReactions();
            }}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer"
            title="Responder mensagem"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
});
