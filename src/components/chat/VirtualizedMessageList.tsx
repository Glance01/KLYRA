import React, { 
  useRef, 
  useState, 
  useEffect, 
  useCallback, 
  useMemo, 
  useLayoutEffect 
} from 'react';
import { SendaMessage } from '../../types';
import { MessageBubble } from './MessageBubble';
import { Avatar } from '../ds/Avatar';
import { ShieldCheck, ChevronDown, Clock } from 'lucide-react';

export type VirtualChatItem = 
  | { id: string; type: 'security_header' }
  | { id: string; type: 'date_header'; label: string }
  | { id: string; type: 'message'; message: SendaMessage }
  | { id: string; type: 'typing'; partner: { displayName: string; avatarUrl?: string } };

interface VirtualizedMessageListProps {
  messages: SendaMessage[];
  currentUserId?: string;
  isGroup?: boolean;
  isPartnerTyping?: boolean;
  partner: { id: string; displayName: string; avatarUrl?: string };
  conversationId?: string;
  activeReactionMsgId: string | null;
  onToggleReaction: (msgId: string | null) => void;
  onSelectReaction: (msgId: string, emoji: string) => void;
  onReply: (msg: SendaMessage) => void;
  onOpenLightbox: (url: string) => void;
  playingAudioId: string | null;
  onTogglePlayAudio: (id: string) => void;
  audioSpeed: number;
  onToggleAudioSpeed: () => void;
}

const DEFAULT_ESTIMATED_HEIGHTS: Record<string, number> = {
  security_header: 80,
  date_header: 44,
  typing: 60,
  message_text: 72,
  message_audio: 88,
  message_media: 280,
};

function getItemEstimatedHeight(item: VirtualChatItem): number {
  if (item.type === 'security_header') return DEFAULT_ESTIMATED_HEIGHTS.security_header;
  if (item.type === 'date_header') return DEFAULT_ESTIMATED_HEIGHTS.date_header;
  if (item.type === 'typing') return DEFAULT_ESTIMATED_HEIGHTS.typing;
  if (item.type === 'message') {
    if (item.message.type === 'audio') return DEFAULT_ESTIMATED_HEIGHTS.message_audio;
    if (item.message.type === 'image' || item.message.type === 'video') return DEFAULT_ESTIMATED_HEIGHTS.message_media;
    return DEFAULT_ESTIMATED_HEIGHTS.message_text;
  }
  return 72;
}

export const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  currentUserId,
  isGroup = false,
  isPartnerTyping = false,
  partner,
  conversationId,
  activeReactionMsgId,
  onToggleReaction,
  onSelectReaction,
  onReply,
  onOpenLightbox,
  playingAudioId,
  onTogglePlayAudio,
  audioSpeed,
  onToggleAudioSpeed,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);
  const [showScrollBottomBtn, setShowScrollBottomBtn] = useState(false);
  const [unreadBelow, setUnreadBelow] = useState(0);

  // Height cache for dynamic measurements
  const heightCache = useRef<Map<string, number>>(new Map());
  const itemNodesRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const isUserPinnedToBottom = useRef(true);
  const prevMessagesCount = useRef(messages.length);

  // Build virtual item list with headers and date separators
  const items = useMemo<VirtualChatItem[]>(() => {
    const list: VirtualChatItem[] = [];

    // 1. Security Header at top
    list.push({
      id: 'header-security-e2ee',
      type: 'security_header'
    });

    // 2. Messages grouped with date separators
    let lastDateStr = '';

    messages.forEach((msg) => {
      // Determine date grouping label
      let dateLabel = 'Hoje';
      if (msg.timestamp) {
        if (msg.timestamp.includes('/')) {
          dateLabel = msg.timestamp.split(' ')[0] || 'Hoje';
        } else if (msg.timestamp.toLowerCase().includes('ontem')) {
          dateLabel = 'Ontem';
        } else if (msg.timestamp.toLowerCase().includes('hoje')) {
          dateLabel = 'Hoje';
        }
      }

      if (dateLabel !== lastDateStr) {
        lastDateStr = dateLabel;
        list.push({
          id: `date-sep-${dateLabel}-${msg.id}`,
          type: 'date_header',
          label: dateLabel
        });
      }

      list.push({
        id: msg.id,
        type: 'message',
        message: msg
      });
    });

    // 3. Typing indicator at bottom
    if (isPartnerTyping) {
      list.push({
        id: 'typing-indicator-partner',
        type: 'typing',
        partner: {
          displayName: partner.displayName,
          avatarUrl: partner.avatarUrl
        }
      });
    }

    return list;
  }, [messages, isPartnerTyping, partner.displayName, partner.avatarUrl]);

  // Measure container viewport on resize
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });

    ro.observe(el);
    setViewportHeight(el.clientHeight);

    return () => ro.disconnect();
  }, []);

  // Compute item positions and total height based on measured/estimated heights
  const { positions, totalHeight } = useMemo(() => {
    let currentTop = 0;
    const pos: Array<{ top: number; height: number }> = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const measured = heightCache.current.get(item.id);
      const height = measured !== undefined ? measured : getItemEstimatedHeight(item);
      pos.push({ top: currentTop, height });
      currentTop += height;
    }

    return { positions: pos, totalHeight: currentTop };
  }, [items]);

  // Binary search to find visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (items.length === 0) return { startIndex: 0, endIndex: 0 };

    const overscan = 6; // buffer items above and below to prevent blank spots on fast scroll
    const minTop = Math.max(0, scrollTop);
    const maxTop = scrollTop + viewportHeight;

    // Binary search for first visible item
    let low = 0;
    let high = items.length - 1;
    let start = 0;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const itemBottom = positions[mid].top + positions[mid].height;
      if (itemBottom >= minTop) {
        start = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // Binary search for last visible item
    low = start;
    high = items.length - 1;
    let end = items.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (positions[mid].top <= maxTop) {
        end = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, end + overscan)
    };
  }, [items.length, positions, scrollTop, viewportHeight]);

  // ResizeObserver to dynamically update exact item heights when rendered
  const measureItem = useCallback((id: string, el: HTMLDivElement | null) => {
    if (!el) {
      itemNodesRef.current.delete(id);
      return;
    }

    itemNodesRef.current.set(id, el);
    const newHeight = el.getBoundingClientRect().height;

    if (newHeight > 0) {
      const existing = heightCache.current.get(id);
      if (existing === undefined || Math.abs(existing - newHeight) > 1) {
        heightCache.current.set(id, newHeight);
      }
    }
  }, []);

  // Observe rendered elements for dynamic height changes (e.g. image loads, audio expands)
  useEffect(() => {
    const observers: ResizeObserver[] = [];

    itemNodesRef.current.forEach((el, id) => {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const h = entry.borderBoxSize?.[0]?.blockSize || entry.contentRect.height;
          if (h > 0) {
            const current = heightCache.current.get(id);
            if (current === undefined || Math.abs(current - h) > 1) {
              heightCache.current.set(id, h);
            }
          }
        }
      });
      ro.observe(el);
      observers.push(ro);
    });

    return () => {
      observers.forEach((ro) => ro.disconnect());
    };
  });

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const currentScrollTop = el.scrollTop;
    setScrollTop(currentScrollTop);

    const distanceFromBottom = el.scrollHeight - currentScrollTop - el.clientHeight;
    const isAtBottom = distanceFromBottom < 120;
    isUserPinnedToBottom.current = isAtBottom;
    setShowScrollBottomBtn(!isAtBottom);

    if (isAtBottom) {
      setUnreadBelow(0);
    }
  }, []);

  // Smooth or instant scroll to bottom
  const scrollToBottom = useCallback((smooth = true) => {
    const el = containerRef.current;
    if (!el) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: smooth ? 'smooth' : 'auto'
    });
    isUserPinnedToBottom.current = true;
    setShowScrollBottomBtn(false);
    setUnreadBelow(0);
  }, []);

  // Initial scroll to bottom on conversation change
  useLayoutEffect(() => {
    scrollToBottom(false);
    // Double check after render layout cycle
    const timer = setTimeout(() => {
      scrollToBottom(false);
    }, 50);
    return () => clearTimeout(timer);
  }, [conversationId]);

  // Handle incoming messages
  useEffect(() => {
    if (messages.length > prevMessagesCount.current) {
      const diff = messages.length - prevMessagesCount.current;
      if (isUserPinnedToBottom.current) {
        // Auto-scroll to bottom if user is reading at the bottom
        scrollToBottom(true);
      } else {
        // Increment unread floating indicator
        setUnreadBelow((prev) => prev + diff);
      }
    }
    prevMessagesCount.current = messages.length;
  }, [messages.length, scrollToBottom]);

  // Render visible virtual items slice
  const visibleItems = useMemo(() => {
    const slice: React.ReactNode[] = [];

    for (let i = startIndex; i <= endIndex; i++) {
      const item = items[i];
      if (!item) continue;

      const pos = positions[i];
      const isMe = item.type === 'message' && item.message.senderId === currentUserId;
      const showReactions = item.type === 'message' && activeReactionMsgId === item.message.id;

      slice.push(
        <div
          key={item.id}
          id={`virtual-item-${item.id}`}
          ref={(el) => measureItem(item.id, el)}
          className="absolute left-0 right-0 w-full will-change-transform"
          style={{
            top: 0,
            transform: `translate3d(0, ${pos?.top || 0}px, 0)`,
          }}
        >
          {item.type === 'security_header' && (
            <div className="mx-auto max-w-sm p-3.5 my-2 rounded-2xl bg-white/70 dark:bg-[#121518]/70 border border-neutral-200/70 dark:border-neutral-800/70 text-center space-y-1 shadow-xs select-none">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ShieldCheck className="w-4 h-4" />
                <span>Criptografia Ponta a Ponta Ativa</span>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-normal">
                Mensagens de texto, áudio e fotos protegidas com cifras locais. Ninguém fora deste canal pode lê-las.
              </p>
            </div>
          )}

          {item.type === 'date_header' && (
            <div className="flex items-center justify-center my-2 select-none">
              <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-neutral-200/70 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-300 border border-neutral-300/40 dark:border-neutral-700/40 shadow-2xs">
                {item.label}
              </span>
            </div>
          )}

          {item.type === 'message' && (
            <MessageBubble
              msg={item.message}
              isMe={isMe}
              isGroup={isGroup}
              currentUserId={currentUserId}
              showReactions={showReactions}
              onToggleReactions={() => onToggleReaction(showReactions ? null : item.message.id)}
              onSelectReaction={(emoji) => onSelectReaction(item.message.id, emoji)}
              onReply={onReply}
              onOpenLightbox={onOpenLightbox}
              playingAudioId={playingAudioId}
              onTogglePlayAudio={onTogglePlayAudio}
              audioSpeed={audioSpeed}
              onToggleAudioSpeed={onToggleAudioSpeed}
            />
          )}

          {item.type === 'typing' && (
            <div className="px-3 py-1.5 flex items-start gap-2 max-w-[70%] animate-in fade-in slide-in-from-bottom-2 duration-200">
              <Avatar 
                size="sm" 
                src={item.partner.avatarUrl} 
                name={item.partner.displayName} 
                presence="available" 
              />
              <div className="bg-neutral-100/90 dark:bg-neutral-900/90 border border-neutral-200/40 dark:border-neutral-800/40 p-3 rounded-2xl rounded-tl-sm flex items-center gap-1.5 shadow-xs">
                <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium font-sans">
                  {item.partner.displayName} está digitando
                </span>
                <div className="flex items-center gap-0.5 ml-1 shrink-0 h-2">
                  <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-1 rounded-full bg-neutral-400 dark:bg-neutral-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      );
    }

    return slice;
  }, [
    startIndex,
    endIndex,
    items,
    positions,
    currentUserId,
    activeReactionMsgId,
    isGroup,
    onToggleReaction,
    onSelectReaction,
    onReply,
    onOpenLightbox,
    playingAudioId,
    onTogglePlayAudio,
    audioSpeed,
    onToggleAudioSpeed,
    measureItem
  ]);

  return (
    <div className="relative flex-1 min-h-0 w-full overflow-hidden">
      {/* Virtual Scroll Container */}
      <div
        id="virtualized-chat-viewport"
        ref={containerRef}
        onScroll={handleScroll}
        className="w-full h-full overflow-y-auto overscroll-contain"
        style={{
          overflowAnchor: 'none', // Prevents browser jarring adjustments during virtual slicing
        }}
      >
        {/* Full scroll runway height */}
        <div
          id="virtualized-chat-runway"
          className="relative w-full"
          style={{
            height: `${Math.max(viewportHeight, totalHeight + 24)}px`,
            minHeight: '100%',
          }}
        >
          {visibleItems}
        </div>
      </div>

      {/* Floating "Scroll to Bottom" button */}
      {showScrollBottomBtn && (
        <button
          id="scroll-to-bottom-button"
          type="button"
          onClick={() => scrollToBottom(true)}
          className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full bg-white dark:bg-[#1A1D21] text-neutral-800 dark:text-neutral-200 border border-neutral-200 dark:border-neutral-800 shadow-lg hover:shadow-xl active:scale-95 transition-all cursor-pointer animate-in fade-in slide-in-from-bottom-2"
        >
          <ChevronDown className="w-4 h-4 text-[var(--senda-accent)]" />
          {unreadBelow > 0 ? (
            <span className="text-[11px] font-bold text-[var(--senda-accent)]">
              {unreadBelow} {unreadBelow === 1 ? 'nova mensagem' : 'novas mensagens'}
            </span>
          ) : (
            <span className="text-[11px] font-medium">Recentes</span>
          )}
        </button>
      )}
    </div>
  );
};
