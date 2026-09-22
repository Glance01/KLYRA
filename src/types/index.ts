export type ThemeMode = 'light' | 'dark' | 'auto';

export type AccentPresetId = 
  | 'blue' 
  | 'lavender' 
  | 'purple' 
  | 'cyan' 
  | 'emerald' 
  | 'rose' 
  | 'ruby' 
  | 'amber' 
  | 'sand' 
  | 'monochrome' 
  | 'custom';

export interface AccentColorConfig {
  id: AccentPresetId;
  name: string;
  hex: string;
  hoverHex: string;
  subtleHex: string;
  textOnAccent: string;
}

export type FontSizeOption = 'sm' | 'base' | 'lg';
export type RadiusOption = 'sharp' | 'medium' | 'rounded';
export type DensityOption = 'compact' | 'comfortable' | 'spacious';
export type BubbleStyle = 'minimal' | 'bordered' | 'soft';
export type LanguageOption = 'pt-BR' | 'pt-PT' | 'en-US' | 'es-ES';

export interface PersonalizationSettings {
  themeMode: ThemeMode;
  accent: AccentPresetId;
  customAccentHex?: string;
  fontSize: FontSizeOption;
  radius: RadiusOption;
  density: DensityOption;
  bubbleStyle: BubbleStyle;
  enableAnimations: boolean;
  soundEnabled: boolean;
  language: LanguageOption;
}

export type PresenceStatus = 'available' | 'busy' | 'dnd' | 'away' | 'invisible';

export interface UserPresence {
  status: PresenceStatus;
  customMessage?: string;
  visibility: 'everyone' | 'contacts' | 'nobody' | 'custom';
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  username: string; // e.g. senda_bruno
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  presence: UserPresence;
  createdAt: string;
  publicKey?: string;
  deviceId: string;
  passwordHash?: string;
}

export interface DeviceSession {
  id: string;
  name: string;
  platform: 'Android' | 'iOS' | 'Web' | 'Desktop';
  lastActive: string;
  isCurrent: boolean;
  fingerprint: string;
}

export type MessageDeliveryStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface MessageReaction {
  emoji: string;
  userId: string;
  count: number;
  users: string[];
}

export interface SendaMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  ciphertext?: string;
  decryptedContent: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';
  mediaUrl?: string;
  mediaDuration?: number; // for audio voice notes
  waveform?: number[];
  status: MessageDeliveryStatus;
  timestamp: string;
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  reactions: MessageReaction[];
  isEphemeral?: boolean;
  expiresAt?: string;
  isEdited?: boolean;
}

export interface Conversation {
  id: string;
  title: string;
  type: 'direct' | 'group' | 'notes';
  avatarUrl?: string;
  participants: UserProfile[];
  lastMessage?: SendaMessage;
  unreadCount: number;
  isPinned: boolean;
  isArchived: boolean;
  isMuted: boolean;
  isBlocked?: boolean;
  ephemeralDuration?: number; // 0 = disabled, seconds (e.g. 3600 = 1h)
  updatedAt: string;
  isE2EE: boolean;
  safetyNumber?: string;
}

export type MomentType = 'thought' | 'photo' | 'audio' | 'location';

export interface SendaMoment {
  id: string;
  author: UserProfile;
  type: MomentType;
  content: string;
  mediaUrl?: string;
  audioDuration?: number;
  audioWaveform?: number[];
  locationName?: string;
  accentColor?: string;
  createdAt: string;
  createdTimestamp?: number;
  expiresInHours: number;
  expiresAtMs?: number;
  viewsCount: number;
  viewedBy?: string[];
  likesCount: number;
  likedBy?: string[];
  privacy: 'all' | 'contacts' | 'custom' | 'only_me';
}
