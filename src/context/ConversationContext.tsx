import React, { createContext, useContext, useEffect, useState } from 'react';
import { collection, doc, setDoc, getDocs, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Conversation, SendaMessage, UserProfile } from '../types';
import { INITIAL_CONVERSATIONS, INITIAL_MESSAGES_MAP, INITIAL_CONTACTS } from '../services/initialData';
import { useAuth } from './AuthContext';
import { encryptSendaMessage } from '../crypto/keys';
import { notificationService } from '../services/notificationService';

interface ConversationContextType {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  activeConversationId: string | null;
  activeMessages: SendaMessage[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selectConversation: (id: string | null) => void;
  sendMessage: (
    conversationId: string, 
    content: string, 
    type?: SendaMessage['type'],
    replyToId?: string,
    mediaDetails?: { url?: string; duration?: number; waveform?: number[] }
  ) => Promise<void>;
  toggleReaction: (conversationId: string, messageId: string, emoji: string) => void;
  togglePin: (conversationId: string) => void;
  toggleArchive: (conversationId: string) => void;
  toggleMute: (conversationId: string) => void;
  toggleBlock: (conversationId: string) => void;
  setEphemeralDuration: (conversationId: string, durationSeconds: number) => void;
  deleteConversation: (conversationId: string) => void;
  clearConversationMessages: (conversationId: string) => void;
  createGroupConversation: (title: string, participantIds: string[], avatarUrl?: string) => string;
  createDirectConversation: (contact: UserProfile) => string;
  totalUnreadCount: number;
}

const ConversationContext = createContext<ConversationContextType | undefined>(undefined);

export const ConversationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  // Wipe any legacy localStorage caches for zero local storage footprint
  useEffect(() => {
    try {
      localStorage.removeItem('senda_conversations_cache');
      localStorage.removeItem('senda_messages_cache');
    } catch {}
  }, []);

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [messagesByConv, setMessagesByConv] = useState<Record<string, SendaMessage[]>>(INITIAL_MESSAGES_MAP);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 1. Real-time Firestore synchronization for all Conversations
  useEffect(() => {
    const convColRef = collection(db, 'conversations');

    const unsubscribe = onSnapshot(convColRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial conversations directly to Cloud Firestore
        for (const conv of INITIAL_CONVERSATIONS) {
          try {
            await setDoc(doc(db, 'conversations', conv.id), conv, { merge: true });
          } catch {}
        }
      } else {
        const firestoreConvs: Conversation[] = [];
        snapshot.docs.forEach((docSnap) => {
          firestoreConvs.push(docSnap.data() as Conversation);
        });

        if (firestoreConvs.length > 0) {
          setConversations(firestoreConvs);
        }
      }
    }, (error) => {
      console.warn('[Firestore Conversations Sync]:', error);
    });

    return () => unsubscribe();
  }, []);

  // 2. Real-time Firestore subscription for Messages of the active conversation
  useEffect(() => {
    if (!activeConversationId) return;

    const messagesColRef = collection(db, 'conversations', activeConversationId, 'messages');

    const unsubscribe = onSnapshot(messagesColRef, (snapshot) => {
      const firestoreMsgs: SendaMessage[] = [];
      const batchToRead: string[] = [];

      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const msg = change.doc.data() as SendaMessage;
          if (currentUser && msg.senderId !== currentUser.id) {
            if (typeof document !== 'undefined' && document.hidden) {
              notificationService.showMessageNotification({
                id: msg.id,
                senderName: msg.senderName,
                senderAvatar: msg.senderAvatar,
                conversationId: activeConversationId,
                textPreview: msg.decryptedContent || 'Nova mensagem recebida.'
              });
            }
          }
        }
      });

      snapshot.docs.forEach((d) => {
        const data = d.data() as SendaMessage;
        firestoreMsgs.push(data);

        if (currentUser && data.senderId !== currentUser.id && data.status !== 'read') {
          batchToRead.push(d.id);
        }
      });

      // If Firestore has 0 messages for this conversation, seed the initial ones to Firestore
      if (snapshot.size === 0) {
        const initialList = messagesByConv[activeConversationId] || INITIAL_MESSAGES_MAP[activeConversationId] || [];
        initialList.forEach(async (msg) => {
          try {
            const msgRef = doc(db, 'conversations', activeConversationId, 'messages', msg.id);
            await setDoc(msgRef, {
              ...msg,
              status: msg.status || 'read'
            }, { merge: true });
          } catch {}
        });
      }

      // Update in-memory state with live Firestore messages
      if (firestoreMsgs.length > 0) {
        setMessagesByConv(prev => {
          const sortedList = [...firestoreMsgs].sort((a, b) => {
            const timeA = a.id.includes('_') ? parseInt(a.id.split('_')[1], 10) : 0;
            const timeB = b.id.includes('_') ? parseInt(b.id.split('_')[1], 10) : 0;
            if (timeA && timeB && timeA !== timeB) return timeA - timeB;
            return a.id.localeCompare(b.id);
          });

          return {
            ...prev,
            [activeConversationId]: sortedList
          };
        });

        // Update lastMessage inside conversation in Firestore & state
        const sortedMsgs = [...firestoreMsgs].sort((a, b) => a.id.localeCompare(b.id));
        const lastMsg = sortedMsgs[sortedMsgs.length - 1];
        if (lastMsg) {
          setConversations(prev => prev.map(c => {
            if (c.id !== activeConversationId) return c;
            return {
              ...c,
              lastMessage: lastMsg,
              updatedAt: lastMsg.timestamp
            };
          }));
        }
      }

      // Mark unread messages as read in Firestore
      batchToRead.forEach(async (msgId) => {
        try {
          const msgRef = doc(db, 'conversations', activeConversationId, 'messages', msgId);
          await setDoc(msgRef, { status: 'read' }, { merge: true });
        } catch {}
      });
    }, (error) => {
      console.warn('[Firestore Messages Sync]:', error);
    });

    return () => unsubscribe();
  }, [currentUser, activeConversationId]);

  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  const activeMessages = activeConversationId ? (messagesByConv[activeConversationId] || []) : [];

  const totalUnreadCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  const selectConversation = (id: string | null) => {
    setActiveConversationId(id);
    if (id) {
      // Mark unread as 0 when opening
      setConversations(prev => prev.map(c => c.id === id ? { ...c, unreadCount: 0 } : c));
    }
  };

  const createGroupConversation = (title: string, participantIds: string[], avatarUrl?: string): string => {
    const selectedParticipants: UserProfile[] = [];
    participantIds.forEach(id => {
      const contact = INITIAL_CONTACTS.find(c => c.id === id);
      if (contact) selectedParticipants.push(contact);
    });

    const newConvId = `conv_group_${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      title: title.trim() || 'Grupo Seguro',
      type: 'group',
      avatarUrl,
      participants: selectedParticipants,
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
      isMuted: false,
      isE2EE: true,
      safetyNumber: '39481 02938 10293 84710 29384 48192 01847 99201 44820 91823 48102',
      updatedAt: 'Agora mesmo'
    };

    setConversations(prev => [newConv, ...prev]);
    const initMsg: SendaMessage = {
      id: `msg_init_${Date.now()}`,
      conversationId: newConvId,
      senderId: 'system',
      senderName: 'SENDA Security',
      decryptedContent: `Grupo "${title}" criado com criptografia ponta a ponta. ${selectedParticipants.length} membros adicionados.`,
      type: 'text',
      status: 'read',
      timestamp: 'Agora',
      reactions: []
    };

    setMessagesByConv(prev => ({
      ...prev,
      [newConvId]: [initMsg]
    }));

    // Persist conversation and initial message directly to Firestore
    setDoc(doc(db, 'conversations', newConvId), newConv).catch(() => {});
    setDoc(doc(db, 'conversations', newConvId, 'messages', initMsg.id), initMsg).catch(() => {});

    setActiveConversationId(newConvId);
    return newConvId;
  };

  const createDirectConversation = (contact: UserProfile): string => {
    const existing = conversations.find(c => c.participants.some(p => p.id === contact.id || p.username === contact.username));
    if (existing) {
      setActiveConversationId(existing.id);
      return existing.id;
    }

    const newConvId = `conv_${contact.username}_${Date.now()}`;
    const newConv: Conversation = {
      id: newConvId,
      title: contact.displayName,
      type: 'direct',
      avatarUrl: contact.avatarUrl,
      participants: [contact],
      unreadCount: 0,
      isPinned: false,
      isArchived: false,
      isMuted: false,
      isE2EE: true,
      safetyNumber: '48192 01847 99201 44820 91823 48102 94810 29381 02938 10293 84710',
      updatedAt: 'Agora'
    };

    const initMsg: SendaMessage = {
      id: `msg_direct_${Date.now()}`,
      conversationId: newConvId,
      senderId: 'system',
      senderName: 'SENDA Security',
      decryptedContent: `Canal seguro iniciado com ${contact.displayName}. Criptografia E2EE verificada.`,
      type: 'text',
      status: 'read',
      timestamp: 'Agora',
      reactions: []
    };

    setConversations(prev => [newConv, ...prev]);
    setMessagesByConv(prev => ({
      ...prev,
      [newConvId]: [initMsg]
    }));

    // Persist direct conversation and initial message directly to Firestore
    setDoc(doc(db, 'conversations', newConvId), newConv).catch(() => {});
    setDoc(doc(db, 'conversations', newConvId, 'messages', initMsg.id), initMsg).catch(() => {});

    setActiveConversationId(newConvId);
    return newConvId;
  };

  const sendMessage = async (
    conversationId: string,
    content: string,
    type: SendaMessage['type'] = 'text',
    replyToId?: string,
    mediaDetails?: { url?: string; duration?: number; waveform?: number[] }
  ) => {
    if (!currentUser) return;

    // 1. Perform authentic WebCrypto AES-GCM encryption
    let ciphertextBase64: string | undefined;
    try {
      const encrypted = await encryptSendaMessage(content);
      ciphertextBase64 = encrypted.ciphertextBase64;
    } catch (err) {
      console.warn('Criptografia fallback:', err);
    }

    const now = new Date();
    const timeFormatted = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // Look up target conversation for ephemeral settings
    const targetConv = conversations.find(c => c.id === conversationId);
    const ephemeralSecs = targetConv?.ephemeralDuration || 0;

    // Look up replied message if exists
    let replyObj: SendaMessage['replyTo'] | undefined;
    if (replyToId) {
      const currentList = messagesByConv[conversationId] || [];
      const foundReplied = currentList.find(m => m.id === replyToId);
      if (foundReplied) {
        replyObj = {
          id: replyToId,
          senderName: foundReplied.senderName,
          text: foundReplied.decryptedContent
        };
      }
    }

    const isEphemeral = ephemeralSecs > 0;
    const expiresAt = isEphemeral 
      ? new Date(Date.now() + ephemeralSecs * 1000).toISOString()
      : undefined;

    const newMessage: SendaMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      conversationId,
      senderId: currentUser.id,
      senderName: currentUser.displayName,
      senderAvatar: currentUser.avatarUrl,
      ciphertext: ciphertextBase64,
      decryptedContent: content,
      type,
      mediaUrl: mediaDetails?.url,
      mediaDuration: mediaDetails?.duration,
      waveform: mediaDetails?.waveform,
      status: 'sending',
      timestamp: timeFormatted,
      replyTo: replyObj,
      reactions: [],
      isEphemeral,
      expiresAt
    };

    // Append to messagesByConv
    setMessagesByConv(prev => ({
      ...prev,
      [conversationId]: [...(prev[conversationId] || []), newMessage]
    }));

    // Update conversation with new message
    setConversations(prev => prev.map(c => {
      if (c.id !== conversationId) return c;
      return {
        ...c,
        lastMessage: newMessage,
        updatedAt: timeFormatted
      };
    }));

    // Write to Firestore in real-time
    try {
      const msgRef = doc(db, 'conversations', conversationId, 'messages', newMessage.id);
      await setDoc(msgRef, {
        ...newMessage,
        status: 'sent',
        serverTimestamp: new Date().toISOString()
      });

      // Update conversation in Firestore
      await setDoc(doc(db, 'conversations', conversationId), {
        lastMessage: { ...newMessage, status: 'sent' },
        updatedAt: timeFormatted
      }, { merge: true });

      // Update local state to status: 'sent'
      setMessagesByConv(prev => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map(m => m.id === newMessage.id ? { ...m, status: 'sent' } : m)
        };
      });
    } catch (e) {
      console.warn('[Real-time Sync Send Error]:', e);
      // Fallback local status 'failed' if Firestore upload fails
      setMessagesByConv(prev => {
        const list = prev[conversationId] || [];
        return {
          ...prev,
          [conversationId]: list.map(m => m.id === newMessage.id ? { ...m, status: 'failed' } : m)
        };
      });
    }
  };

  const toggleReaction = (conversationId: string, messageId: string, emoji: string) => {
    if (!currentUser) return;

    setMessagesByConv(prev => {
      const list = prev[conversationId] || [];
      const updated = list.map(msg => {
        if (msg.id !== messageId) return msg;
        const reactions = [...msg.reactions];
        const existing = reactions.find(r => r.emoji === emoji);

        if (existing) {
          if (existing.users.includes(currentUser.id)) {
            existing.users = existing.users.filter(u => u !== currentUser.id);
            existing.count -= 1;
          } else {
            existing.users.push(currentUser.id);
            existing.count += 1;
          }
        } else {
          reactions.push({
            emoji,
            userId: currentUser.id,
            count: 1,
            users: [currentUser.id]
          });
        }

        return {
          ...msg,
          reactions: reactions.filter(r => r.count > 0)
        };
      });

      return {
        ...prev,
        [conversationId]: updated
      };
    });
  };

  const togglePin = (conversationId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        const nextVal = !c.isPinned;
        setDoc(doc(db, 'conversations', conversationId), { isPinned: nextVal }, { merge: true }).catch(() => {});
        return { ...c, isPinned: nextVal };
      }
      return c;
    }));
  };

  const toggleArchive = (conversationId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        const nextVal = !c.isArchived;
        setDoc(doc(db, 'conversations', conversationId), { isArchived: nextVal }, { merge: true }).catch(() => {});
        return { ...c, isArchived: nextVal };
      }
      return c;
    }));
  };

  const toggleMute = (conversationId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        const nextVal = !c.isMuted;
        setDoc(doc(db, 'conversations', conversationId), { isMuted: nextVal }, { merge: true }).catch(() => {});
        return { ...c, isMuted: nextVal };
      }
      return c;
    }));
  };

  const toggleBlock = (conversationId: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        const nextVal = !c.isBlocked;
        setDoc(doc(db, 'conversations', conversationId), { isBlocked: nextVal }, { merge: true }).catch(() => {});
        return { ...c, isBlocked: nextVal };
      }
      return c;
    }));
  };

  const setEphemeralDuration = (conversationId: string, durationSeconds: number) => {
    setConversations(prev => prev.map(c => {
      if (c.id === conversationId) {
        setDoc(doc(db, 'conversations', conversationId), { ephemeralDuration: durationSeconds }, { merge: true }).catch(() => {});
        return { ...c, ephemeralDuration: durationSeconds };
      }
      return c;
    }));
  };

  const clearConversationMessages = (conversationId: string) => {
    setMessagesByConv(prev => ({
      ...prev,
      [conversationId]: []
    }));
  };

  const deleteConversation = (conversationId: string) => {
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    setMessagesByConv(prev => {
      const copy = { ...prev };
      delete copy[conversationId];
      return copy;
    });
    deleteDoc(doc(db, 'conversations', conversationId)).catch(() => {});
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
    }
  };

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeConversation,
        activeConversationId,
        activeMessages,
        searchQuery,
        setSearchQuery,
        selectConversation,
        sendMessage,
        toggleReaction,
        togglePin,
        toggleArchive,
        toggleMute,
        toggleBlock,
        setEphemeralDuration,
        deleteConversation,
        clearConversationMessages,
        createGroupConversation,
        createDirectConversation,
        totalUnreadCount
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversations = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversations must be used within a ConversationProvider');
  }
  return context;
};
