import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc,
  serverTimestamp,
  writeBatch,
  query,
  where,
  limit
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { UserProfile, Conversation, SendaMessage, PersonalizationSettings } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errMsg = error instanceof Error ? error.message : String(error);
  const errCode = (error as any)?.code;

  const errInfo: FirestoreErrorInfo = {
    error: errMsg,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };

  if (errCode === 'unavailable' || errMsg.includes('unavailable') || errMsg.includes('client is offline') || errMsg.includes('Could not reach Cloud Firestore')) {
    console.warn('[SENDA Firestore Offline/Unavailable]:', errMsg);
  } else {
    console.error('[SENDA Firestore Error]:', JSON.stringify(errInfo));
  }
  
  throw new Error(JSON.stringify(errInfo));
}

const LOCAL_KNOWN_USERNAMES_KEY = 'senda_known_usernames';

function getLocalKnownUsernames(): string[] {
  try {
    const raw = localStorage.getItem(LOCAL_KNOWN_USERNAMES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function addLocalKnownUsername(username: string): void {
  try {
    const clean = username.trim().replace(/^@/, '').toLowerCase();
    if (!clean) return;
    const list = getLocalKnownUsernames();
    if (!list.includes(clean)) {
      list.push(clean);
      localStorage.setItem(LOCAL_KNOWN_USERNAMES_KEY, JSON.stringify(list));
    }
  } catch {}
}

/**
 * Salva ou atualiza a conta e perfil do usuário no Firestore
 * Garante unicidade estrita do username contra duplicidade
 */
export async function syncUserProfileToFirestore(profile: UserProfile): Promise<void> {
  const path = `users/${profile.id}`;
  const cleanUsername = profile.username.trim().replace(/^@/, '').toLowerCase();

  try {
    // 1. Verificar se o username já está registrado para outro usuário
    const usernameRef = doc(db, 'usernames', cleanUsername);
    const existingSnap = await getDoc(usernameRef);
    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      if (existingData?.userId && existingData.userId !== profile.id) {
        throw new Error('ACCOUNT_ALREADY_EXISTS');
      }
    }

    // 2. Registrar no índice global e único de usernames
    await setDoc(usernameRef, {
      userId: profile.id,
      username: cleanUsername,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl || '',
      updatedAt: new Date().toISOString(),
      serverUpdated: serverTimestamp()
    }, { merge: true });

    // 3. Salvar documento principal do usuário
    const userRef = doc(db, 'users', profile.id);
    await setDoc(userRef, {
      id: profile.id,
      username: cleanUsername,
      displayName: profile.displayName,
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
      publicKey: profile.publicKey || '',
      deviceId: profile.deviceId,
      passwordHash: profile.passwordHash || '',
      presence: profile.presence || null,
      updatedAt: new Date().toISOString(),
      serverUpdated: serverTimestamp()
    }, { merge: true });

    // 4. Armazenar também no registro local resiliente
    addLocalKnownUsername(cleanUsername);
  } catch (error: any) {
    if (error?.message === 'ACCOUNT_ALREADY_EXISTS') {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

/**
 * Verifica se o username já está cadastrado no Firestore ou no sistema
 */
export async function checkUsernameExists(username: string): Promise<boolean> {
  const clean = username.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return false;

  // 1. Direct O(1) registry check in 'usernames' collection
  try {
    const usernameDocRef = doc(db, 'usernames', clean);
    const usernameSnap = await getDoc(usernameDocRef);
    if (usernameSnap.exists()) {
      addLocalKnownUsername(clean);
      return true;
    }
  } catch (err) {
    console.warn('[checkUsernameExists registry check error]:', err);
  }

  // 2. Query 'users' collection where username == clean
  try {
    const q = query(collection(db, 'users'), where('username', '==', clean), limit(1));
    const querySnap = await getDocs(q);
    if (!querySnap.empty) {
      addLocalKnownUsername(clean);
      return true;
    }
  } catch (err) {
    console.warn('[checkUsernameExists query error]:', err);
  }

  // 3. Direct document ID check in 'users'
  try {
    const userDocRef = doc(db, 'users', clean);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      addLocalKnownUsername(clean);
      return true;
    }
  } catch (err) {
    console.warn('[checkUsernameExists direct user doc error]:', err);
  }

  // 4. Fallback scan all users in collection (case-insensitive check)
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      const data = d.data();
      const u = (data.username || '').trim().replace(/^@/, '').toLowerCase();
      if (u === clean || d.id.toLowerCase() === clean) {
        addLocalKnownUsername(clean);
        return true;
      }
    }
  } catch (err) {
    console.warn('[checkUsernameExists scan error]:', err);
  }

  // 5. Local persistent registry check
  const localList = getLocalKnownUsernames();
  if (localList.includes(clean)) {
    return true;
  }

  return false;
}

/**
 * Recupera perfil de usuário no Firestore por ID ou por username com verificação de senha
 */
export async function verifyAndRecoverAccountFromFirestore(usernameOrId: string, passwordHash: string): Promise<UserProfile | null> {
  const profile = await fetchUserProfileFromFirestore(usernameOrId);
  if (!profile) return null;

  // Se a conta tem senha cadastrada, verifica se o hash confere
  if (profile.passwordHash && profile.passwordHash !== passwordHash) {
    throw new Error('INVALID_PASSWORD');
  }

  return profile;
}

/**
 * Recupera perfil de usuário no Firestore por ID ou por username
 */
export async function fetchUserProfileFromFirestore(userIdOrUsername: string): Promise<UserProfile | null> {
  const clean = userIdOrUsername.trim().replace(/^@/, '').toLowerCase();
  if (!clean) return null;
  
  // 1. Check usernames registry to resolve userId
  try {
    const usernameRef = doc(db, 'usernames', clean);
    const usernameSnap = await getDoc(usernameRef);
    if (usernameSnap.exists()) {
      const uData = usernameSnap.data();
      if (uData?.userId) {
        const userRef = doc(db, 'users', uData.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          return userSnap.data() as UserProfile;
        }
      }
    }
  } catch {}

  // 2. Tentar por ID direto
  const directPath = `users/${clean}`;
  try {
    const docRef = doc(db, 'users', clean);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
  } catch {
    // Continuar para consulta por username
  }

  // 3. Tentar buscar em todos os usuários correspondentes pelo username
  const listPath = 'users';
  try {
    const colRef = collection(db, 'users');
    const snapshot = await getDocs(colRef);
    for (const d of snapshot.docs) {
      const data = d.data();
      if (data.username === clean || d.id === clean) {
        return data as UserProfile;
      }
    }
    return null;
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errCode = error?.code;
    if (errCode === 'unavailable' || errMsg.includes('unavailable') || errMsg.includes('offline')) {
      console.warn('[SENDA Firestore]: Servidor temporariamente indisponível para busca de perfil.');
      return null;
    }
    console.warn('[fetchUserProfileFromFirestore error]:', error);
    return null;
  }
}

/**
 * Sincroniza conversas e mensagens para o Firestore da conta do usuário
 */
export async function syncConversationsToFirestore(
  userId: string, 
  conversations: Conversation[],
  messagesByConv: Record<string, SendaMessage[]>
): Promise<void> {
  if (!userId) return;

  try {
    const batch = writeBatch(db);

    for (const conv of conversations) {
      const convRef = doc(db, 'users', userId, 'conversations', conv.id);
      batch.set(convRef, {
        id: conv.id,
        userId,
        title: conv.title,
        type: conv.type,
        avatarUrl: conv.avatarUrl || '',
        isPinned: conv.isPinned || false,
        isArchived: conv.isArchived || false,
        isMuted: conv.isMuted || false,
        updatedAt: conv.updatedAt || new Date().toISOString(),
        isE2EE: conv.isE2EE ?? true
      }, { merge: true });

      // Sincronizar mensagens associadas a esta conversa
      const messages = messagesByConv[conv.id] || [];
      for (const msg of messages.slice(-50)) { // salva as últimas 50 mensagens por chat
        const msgRef = doc(db, 'users', userId, 'conversations', conv.id, 'messages', msg.id);
        batch.set(msgRef, {
          id: msg.id,
          conversationId: conv.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          senderAvatar: msg.senderAvatar || '',
          ciphertext: msg.ciphertext || '',
          decryptedContent: msg.decryptedContent,
          type: msg.type,
          mediaUrl: msg.mediaUrl || '',
          status: msg.status,
          timestamp: msg.timestamp
        }, { merge: true });
      }
    }

    await batch.commit();
  } catch (error) {
    console.warn('[SENDA Firestore Sync]: Falha ao sincronizar em lote:', error);
  }
}

/**
 * Recupera todas as conversas e mensagens salvas no Firestore para restaurar em novo celular
 */
export async function restoreAccountDataFromFirestore(userId: string): Promise<{
  conversations: Conversation[];
  messagesByConv: Record<string, SendaMessage[]>;
}> {
  const path = `users/${userId}/conversations`;
  try {
    const convCol = collection(db, 'users', userId, 'conversations');
    const convSnap = await getDocs(convCol);

    const conversations: Conversation[] = [];
    const messagesByConv: Record<string, SendaMessage[]> = {};

    for (const d of convSnap.docs) {
      const convData = d.data() as Conversation;
      conversations.push(convData);

      // Carregar mensagens de cada conversa
      const msgCol = collection(db, 'users', userId, 'conversations', d.id, 'messages');
      const msgSnap = await getDocs(msgCol);
      const msgs: SendaMessage[] = [];
      msgSnap.forEach(mDoc => {
        msgs.push(mDoc.data() as SendaMessage);
      });

      // Ordenar mensagens cronologicamente
      msgs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      messagesByConv[d.id] = msgs;
    }

    return { conversations, messagesByConv };
  } catch (error: any) {
    const errMsg = error?.message || String(error);
    const errCode = error?.code;
    if (errCode === 'unavailable' || errMsg.includes('unavailable') || errMsg.includes('offline')) {
      console.warn('[SENDA Firestore]: Servidor temporariamente indisponível para restauração.');
      return { conversations: [], messagesByConv: {} };
    }
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
  * Salva as preferências de personalização do usuário no Firestore
  */
export async function syncPersonalizationToFirestore(userId: string, settings: PersonalizationSettings): Promise<void> {
  if (!userId) return;
  const path = `users/${userId}/settings/personalization`;
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'personalization');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: new Date().toISOString(),
      serverTimestamp: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.warn('[SENDA Firestore Sync]: Falha ao salvar personalização no Firestore:', error);
  }
}

/**
  * Busca as preferências de personalização salvas no Firestore para o usuário
  */
export async function fetchPersonalizationFromFirestore(userId: string): Promise<Partial<PersonalizationSettings> | null> {
  if (!userId) return null;
  try {
    const settingsRef = doc(db, 'users', userId, 'settings', 'personalization');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      return snap.data() as Partial<PersonalizationSettings>;
    }
    return null;
  } catch (error) {
    console.warn('[SENDA Firestore Sync]: Falha ao buscar personalização do Firestore:', error);
    return null;
  }
}
