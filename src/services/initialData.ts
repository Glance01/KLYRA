import { Conversation, UserProfile, SendaMoment, SendaMessage } from '../types';

export const INITIAL_CONTACTS: UserProfile[] = [
  {
    id: 'usr_helena',
    username: 'helena_ramos',
    displayName: 'Helena Ramos',
    bio: 'Arquiteta e fotógrafa. Explorando a cidade.',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    presence: {
      status: 'available',
      customMessage: 'Disponível no ateliê',
      visibility: 'everyone',
      updatedAt: '2026-09-21T07:45:00Z'
    },
    createdAt: '2026-01-10T10:00:00Z',
    deviceId: 'dev_helena_primary'
  },
  {
    id: 'usr_marcos',
    username: 'marcos_eng',
    displayName: 'Marcos Silveira',
    bio: 'Engenharia de sistemas descentralizados.',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    presence: {
      status: 'busy',
      customMessage: 'Em reunião de sprint',
      visibility: 'everyone',
      updatedAt: '2026-09-21T08:00:00Z'
    },
    createdAt: '2026-02-14T14:30:00Z',
    deviceId: 'dev_marcos_phone'
  },
  {
    id: 'usr_clara',
    username: 'clara_design',
    displayName: 'Clara Mendes',
    bio: 'Tipografia, editorial e design de produto.',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    presence: {
      status: 'dnd',
      customMessage: 'Foco total em protótipos',
      visibility: 'contacts',
      updatedAt: '2026-09-21T06:15:00Z'
    },
    createdAt: '2026-03-01T09:10:00Z',
    deviceId: 'dev_clara_mac'
  },
  {
    id: 'usr_thiago',
    username: 'thiago_music',
    displayName: 'Thiago Valente',
    bio: 'Compositor e produtor sonoro.',
    avatarUrl: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
    presence: {
      status: 'available',
      customMessage: 'Ouvindo novas faixas',
      visibility: 'everyone',
      updatedAt: '2026-09-21T07:20:00Z'
    },
    createdAt: '2026-03-12T16:00:00Z',
    deviceId: 'dev_thiago_pad'
  }
];

export const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'conv_helena',
    title: 'Helena Ramos',
    type: 'direct',
    participants: [INITIAL_CONTACTS[0]],
    unreadCount: 1,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    ephemeralDuration: 86400, // 24 hours
    isE2EE: true,
    safetyNumber: '48192 01847 99201 44820 91823 48102 94810 29381 02938 10293 84710 29384',
    updatedAt: '10:43',
    lastMessage: {
      id: 'msg_h4',
      conversationId: 'conv_helena',
      senderId: 'usr_helena',
      senderName: 'Helena Ramos',
      decryptedContent: 'Conseguiu revisar o conceito visual do SENDA que te mandei?',
      type: 'text',
      status: 'delivered',
      timestamp: '10:43',
      reactions: []
    }
  },
  {
    id: 'conv_marcos',
    title: 'Marcos Silveira',
    type: 'direct',
    participants: [INITIAL_CONTACTS[1]],
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isMuted: false,
    isE2EE: true,
    safetyNumber: '29481 02938 10293 84710 29384 48192 01847 99201 44820 91823 48102 94810',
    updatedAt: 'Ontem',
    lastMessage: {
      id: 'msg_m2',
      conversationId: 'conv_marcos',
      senderId: 'usr_me',
      senderName: 'Você',
      decryptedContent: 'As chaves do dispositivo foram geradas perfeitamente via WebCrypto.',
      type: 'text',
      status: 'read',
      timestamp: 'Ontem',
      reactions: [{ emoji: '👍', userId: 'usr_marcos', count: 1, users: ['usr_marcos'] }]
    }
  },
  {
    id: 'conv_core_team',
    title: 'SENDA Core Collective',
    type: 'group',
    participants: [INITIAL_CONTACTS[0], INITIAL_CONTACTS[1], INITIAL_CONTACTS[2]],
    unreadCount: 2,
    isPinned: true,
    isArchived: false,
    isMuted: false,
    isE2EE: true,
    safetyNumber: '11029 38471 02938 48192 01847 99201 44820 91823 48102 94810 29381 02938',
    updatedAt: '11:15',
    lastMessage: {
      id: 'msg_g2',
      conversationId: 'conv_core_team',
      senderId: 'usr_clara',
      senderName: 'Clara Mendes',
      decryptedContent: 'Adicionei a paleta de alto contraste nas diretrizes!',
      type: 'text',
      status: 'delivered',
      timestamp: '11:15',
      reactions: [{ emoji: '🎉', userId: 'usr_helena', count: 1, users: ['usr_helena'] }]
    }
  },
  {
    id: 'conv_clara',
    title: 'Clara Mendes',
    type: 'direct',
    participants: [INITIAL_CONTACTS[2]],
    unreadCount: 0,
    isPinned: false,
    isArchived: false,
    isMuted: true,
    isE2EE: true,
    safetyNumber: '91823 48102 94810 29381 02938 10293 84710 29384 48192 01847 99201 44820',
    updatedAt: 'Sex',
    lastMessage: {
      id: 'msg_c1',
      conversationId: 'conv_clara',
      senderId: 'usr_clara',
      senderName: 'Clara Mendes',
      decryptedContent: 'A tipografia Plus Jakarta Sans conferiu uma leitura muito tranquila.',
      type: 'text',
      status: 'read',
      timestamp: 'Sex',
      reactions: []
    }
  }
];

export const INITIAL_MESSAGES_MAP: Record<string, SendaMessage[]> = {
  conv_helena: [
    {
      id: 'msg_h1',
      conversationId: 'conv_helena',
      senderId: 'usr_helena',
      senderName: 'Helena Ramos',
      decryptedContent: 'Bom dia! Finalizei os estudos da fachada do novo ateliê.',
      type: 'text',
      status: 'read',
      timestamp: '10:38',
      reactions: [{ emoji: '✨', userId: 'usr_me', count: 1, users: ['usr_me'] }]
    },
    {
      id: 'msg_h2',
      conversationId: 'conv_helena',
      senderId: 'usr_helena',
      senderName: 'Helena Ramos',
      decryptedContent: 'Fotografia dos materiais',
      type: 'image',
      mediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
      status: 'read',
      timestamp: '10:39',
      reactions: []
    },
    {
      id: 'msg_h3',
      conversationId: 'conv_helena',
      senderId: 'usr_me',
      senderName: 'Você',
      decryptedContent: 'Ficou impressionante! A iluminação natural harmonizou muito bem com a madeira.',
      type: 'text',
      status: 'read',
      timestamp: '10:41',
      reactions: []
    },
    {
      id: 'msg_h4',
      conversationId: 'conv_helena',
      senderId: 'usr_helena',
      senderName: 'Helena Ramos',
      decryptedContent: 'Conseguiu revisar o conceito visual do SENDA que te mandei?',
      type: 'text',
      status: 'delivered',
      timestamp: '10:43',
      reactions: []
    }
  ],
  conv_marcos: [
    {
      id: 'msg_m1',
      conversationId: 'conv_marcos',
      senderId: 'usr_marcos',
      senderName: 'Marcos Silveira',
      decryptedContent: 'Fala Bruno! Como está o desempenho da geração de pares Ed25519 no navegador?',
      type: 'text',
      status: 'read',
      timestamp: 'Ontem 15:20',
      reactions: []
    },
    {
      id: 'msg_m2',
      conversationId: 'conv_marcos',
      senderId: 'usr_me',
      senderName: 'Você',
      decryptedContent: 'As chaves do dispositivo foram geradas perfeitamente via WebCrypto.',
      type: 'text',
      status: 'read',
      timestamp: 'Ontem 15:25',
      reactions: [{ emoji: '👍', userId: 'usr_marcos', count: 1, users: ['usr_marcos'] }]
    }
  ],
  conv_core_team: [
    {
      id: 'msg_g1',
      conversationId: 'conv_core_team',
      senderId: 'usr_helena',
      senderName: 'Helena Ramos',
      decryptedContent: 'Bem-vindos ao canal criptografado do coletivo!',
      type: 'text',
      status: 'read',
      timestamp: '11:10',
      reactions: []
    },
    {
      id: 'msg_g2',
      conversationId: 'conv_core_team',
      senderId: 'usr_clara',
      senderName: 'Clara Mendes',
      decryptedContent: 'Adicionei a paleta de alto contraste nas diretrizes!',
      type: 'text',
      status: 'delivered',
      timestamp: '11:15',
      reactions: [{ emoji: '🎉', userId: 'usr_helena', count: 1, users: ['usr_helena'] }]
    }
  ],
  conv_clara: [
    {
      id: 'msg_c1',
      conversationId: 'conv_clara',
      senderId: 'usr_clara',
      senderName: 'Clara Mendes',
      decryptedContent: 'A tipografia Plus Jakarta Sans conferiu uma leitura muito tranquila.',
      type: 'text',
      status: 'read',
      timestamp: 'Sex',
      reactions: []
    }
  ]
};

export const INITIAL_MOMENTS: SendaMoment[] = [
  {
    id: 'mom_1',
    author: INITIAL_CONTACTS[0],
    type: 'photo',
    content: 'A luz suave da manhã entrando no estúdio.',
    mediaUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&auto=format&fit=crop&q=80',
    locationName: 'Ateliê Central',
    accentColor: '#3B82F6',
    createdAt: 'Há 2 horas',
    createdTimestamp: Date.now() - 2 * 3600 * 1000,
    expiresInHours: 24,
    expiresAtMs: Date.now() + 22 * 3600 * 1000,
    viewsCount: 14,
    likesCount: 6,
    privacy: 'all'
  },
  {
    id: 'mom_2',
    author: INITIAL_CONTACTS[2],
    type: 'thought',
    content: 'Simplicidade não é falta de recursos. É a ausência de distrações que não agregam.',
    accentColor: '#8B5CF6',
    createdAt: 'Há 4 horas',
    createdTimestamp: Date.now() - 4 * 3600 * 1000,
    expiresInHours: 24,
    expiresAtMs: Date.now() + 20 * 3600 * 1000,
    viewsCount: 22,
    likesCount: 11,
    privacy: 'contacts'
  },
  {
    id: 'mom_3',
    author: INITIAL_CONTACTS[3],
    type: 'audio',
    content: 'Testando novas texturas sonoras para o ambiente noturno.',
    audioDuration: 18,
    audioWaveform: [30, 60, 45, 80, 95, 70, 50, 65, 85, 90, 40, 60, 75, 55, 35],
    accentColor: '#10B981',
    createdAt: 'Há 6 horas',
    createdTimestamp: Date.now() - 6 * 3600 * 1000,
    expiresInHours: 12,
    expiresAtMs: Date.now() + 6 * 3600 * 1000,
    viewsCount: 9,
    likesCount: 4,
    privacy: 'contacts'
  }
];
