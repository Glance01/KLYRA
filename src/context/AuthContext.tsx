import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserPresence, DeviceSession } from '../types';
import { generateDeviceKeyBundle, DeviceKeyBundle, hashPassword } from '../crypto/keys';
import { syncUserProfileToFirestore, verifyAndRecoverAccountFromFirestore, checkUsernameExists } from '../services/firestoreSyncService';
import { getItem, saveItem, deleteItem, STORES } from '../services/storageService';

interface AuthContextType {
  currentUser: UserProfile | null;
  hasCompletedOnboarding: boolean;
  isLoading: boolean;
  deviceKeys: DeviceKeyBundle | null;
  connectedDevices: DeviceSession[];
  isLocked: boolean;
  lockPin: string | null;
  lockTimeoutMinutes: number;
  completeOnboarding: (displayName: string, username: string, password: string, avatarUrl?: string, bio?: string) => Promise<void>;
  recoverAccount: (usernameOrId: string, password: string) => Promise<boolean>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  updatePresence: (status: UserPresence['status'], customMessage?: string) => void;
  updatePresenceVisibility: (visibility: UserPresence['visibility']) => void;
  setAppLockPin: (pin: string | null, timeoutMinutes?: number) => void;
  unlockApp: (pin: string) => boolean;
  lockAppNow: () => void;
  logout: () => void;
  revokeDevice: (deviceId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USER = 'senda_user_profile';
const STORAGE_KEY_KEYS = 'senda_device_keys';
const STORAGE_KEY_DEVICES = 'senda_connected_devices';
const STORAGE_KEY_LOCK = 'senda_app_lock_config';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [deviceKeys, setDeviceKeys] = useState<DeviceKeyBundle | null>(null);
  const [connectedDevices, setConnectedDevices] = useState<DeviceSession[]>([]);
  
  // App Lock State
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [lockPin, setLockPin] = useState<string | null>(null);
  const [lockTimeoutMinutes, setLockTimeoutMinutes] = useState<number>(0);

  // Initialize auth & crypto identity on boot from IndexedDB
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Read from IndexedDB first
        let storedUser = await getItem<UserProfile>(STORES.SETTINGS, 'auth_user');
        let storedKeys = await getItem<DeviceKeyBundle>(STORES.SETTINGS, 'auth_keys');
        let storedDevices = await getItem<DeviceSession[]>(STORES.SETTINGS, 'auth_devices');
        let storedLock = await getItem<{ pin: string | null; timeoutMinutes: number }>(STORES.SETTINGS, 'auth_lock');

        // Migrate from legacy localStorage if present, then purge localStorage immediately
        if (!storedUser) {
          const legacyUserStr = localStorage.getItem(STORAGE_KEY_USER);
          if (legacyUserStr) {
            try { storedUser = JSON.parse(legacyUserStr); } catch {}
          }
        }
        if (!storedKeys) {
          const legacyKeysStr = localStorage.getItem(STORAGE_KEY_KEYS);
          if (legacyKeysStr) {
            try { storedKeys = JSON.parse(legacyKeysStr); } catch {}
          }
        }
        if (!storedDevices) {
          const legacyDevStr = localStorage.getItem(STORAGE_KEY_DEVICES);
          if (legacyDevStr) {
            try { storedDevices = JSON.parse(legacyDevStr); } catch {}
          }
        }
        if (!storedLock) {
          const legacyLockStr = localStorage.getItem(STORAGE_KEY_LOCK);
          if (legacyLockStr) {
            try { storedLock = JSON.parse(legacyLockStr); } catch {}
          }
        }

        // Wipe legacy localStorage keys
        try {
          localStorage.removeItem(STORAGE_KEY_USER);
          localStorage.removeItem(STORAGE_KEY_KEYS);
          localStorage.removeItem(STORAGE_KEY_DEVICES);
          localStorage.removeItem(STORAGE_KEY_LOCK);
        } catch {}

        if (storedLock) {
          setLockPin(storedLock.pin || null);
          setLockTimeoutMinutes(storedLock.timeoutMinutes || 0);
          if (storedLock.pin) {
            setIsLocked(true);
          }
          await saveItem(STORES.SETTINGS, 'auth_lock', storedLock);
        }

        if (storedUser && storedKeys) {
          const userObj: UserProfile = storedUser;
          if (!userObj.presence || !userObj.presence.status) {
            userObj.presence = {
              status: 'available',
              customMessage: 'Disponível',
              visibility: 'everyone',
              updatedAt: new Date().toISOString()
            };
          }
          const keysObj: DeviceKeyBundle = storedKeys;
          
          setCurrentUser(userObj);
          setDeviceKeys(keysObj);
          setHasCompletedOnboarding(true);

          await saveItem(STORES.SETTINGS, 'auth_user', userObj);
          await saveItem(STORES.SETTINGS, 'auth_keys', keysObj);

          if (storedDevices && storedDevices.length > 0) {
            setConnectedDevices(storedDevices);
            await saveItem(STORES.SETTINGS, 'auth_devices', storedDevices);
          } else {
            const initialDevice: DeviceSession = {
              id: keysObj.deviceId,
              name: 'Navegador Web Primário (Este dispositivo)',
              platform: 'Web',
              lastActive: 'Agora mesmo',
              isCurrent: true,
              fingerprint: keysObj.fingerprint.substring(0, 19) + '...'
            };
            setConnectedDevices([initialDevice]);
            await saveItem(STORES.SETTINGS, 'auth_devices', [initialDevice]);
          }
        } else {
          setHasCompletedOnboarding(false);
        }
      } catch (err) {
        console.error('Erro ao carregar sessão SENDA:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const completeOnboarding = async (
    displayName: string,
    username: string,
    password: string,
    avatarUrl?: string,
    bio?: string
  ) => {
    setIsLoading(true);
    try {
      const cleanUsername = username.replace(/^@/, '').trim().toLowerCase();

      // Enforce unique accounts: prevent duplicate account creation
      const alreadyExists = await checkUsernameExists(cleanUsername);
      if (alreadyExists) {
        throw new Error('ACCOUNT_ALREADY_EXISTS');
      }

      // 1. Generate real hardware/WebCrypto device keypair
      const keys = await generateDeviceKeyBundle();
      
      const passwordHash = await hashPassword(password);

      const newUser: UserProfile = {
        id: `usr_${Math.random().toString(36).substring(2, 11)}`,
        username: cleanUsername,
        displayName: displayName.trim(),
        bio: bio?.trim() || 'Conectado via SENDA.',
        avatarUrl: avatarUrl || undefined,
        presence: {
          status: 'available',
          customMessage: 'Disponível',
          visibility: 'everyone',
          updatedAt: new Date().toISOString()
        },
        createdAt: new Date().toISOString(),
        deviceId: keys.deviceId,
        passwordHash
      };

      const primaryDevice: DeviceSession = {
        id: keys.deviceId,
        name: 'Dispositivo Atual (Web Client)',
        platform: 'Web',
        lastActive: 'Ativo agora',
        isCurrent: true,
        fingerprint: keys.fingerprint.substring(0, 19) + '...'
      };

      // 1. Sincronizar e reservar o usuário diretamente no Cloud Firestore PRIMEIRO!
      // Se a conta já existir ou houver conflito de username, aborta imediatamente
      await syncUserProfileToFirestore(newUser);

      // 2. Apenas após confirmação estrita de reserva no Firestore, salvar no armazenamento local
      await saveItem(STORES.SETTINGS, 'auth_user', newUser);
      await saveItem(STORES.SETTINGS, 'auth_keys', keys);
      await saveItem(STORES.SETTINGS, 'auth_devices', [primaryDevice]);

      // Ensure localStorage has no legacy leftovers
      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_KEYS);
        localStorage.removeItem(STORAGE_KEY_DEVICES);
      } catch {}

      setCurrentUser(newUser);
      setDeviceKeys(keys);
      setConnectedDevices([primaryDevice]);
      setHasCompletedOnboarding(true);
    } catch (err: any) {
      if (err.message !== 'ACCOUNT_ALREADY_EXISTS' && err.message !== 'USERNAME_ALREADY_EXISTS') {
        console.error('Falha ao concluir onboarding:', err);
      }
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const recoverAccount = async (usernameOrId: string, password: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const passwordHash = await hashPassword(password);
      const profile = await verifyAndRecoverAccountFromFirestore(usernameOrId, passwordHash);
      if (!profile) {
        return false;
      }

      // Gera novo par de chaves para este novo dispositivo/celular
      const keys = await generateDeviceKeyBundle();
      
      const updatedUser: UserProfile = {
        ...profile,
        deviceId: keys.deviceId
      };

      const currentDeviceSession: DeviceSession = {
        id: keys.deviceId,
        name: 'Dispositivo Recuperado (Este aparelho)',
        platform: 'Web',
        lastActive: 'Ativo agora',
        isCurrent: true,
        fingerprint: keys.fingerprint.substring(0, 19) + '...'
      };

      await saveItem(STORES.SETTINGS, 'auth_user', updatedUser);
      await saveItem(STORES.SETTINGS, 'auth_keys', keys);
      await saveItem(STORES.SETTINGS, 'auth_devices', [currentDeviceSession]);

      try {
        localStorage.removeItem(STORAGE_KEY_USER);
        localStorage.removeItem(STORAGE_KEY_KEYS);
        localStorage.removeItem(STORAGE_KEY_DEVICES);
      } catch {}

      setCurrentUser(updatedUser);
      setDeviceKeys(keys);
      setConnectedDevices([currentDeviceSession]);
      setHasCompletedOnboarding(true);

      // Re-sincronizar status no Firestore
      syncUserProfileToFirestore(updatedUser).catch(() => {});

      return true;
    } catch (err: any) {
      if (err.message === 'INVALID_PASSWORD') {
        throw err;
      }
      console.error('Erro ao recuperar conta do Firestore:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    saveItem(STORES.SETTINGS, 'auth_user', updated).catch(() => {});
    syncUserProfileToFirestore(updated).catch(() => {});
  };

  const updatePresence = (status: UserPresence['status'], customMessage?: string) => {
    if (!currentUser) return;
    const updatedPresence: UserPresence = {
      ...currentUser.presence,
      status,
      customMessage: customMessage !== undefined ? customMessage : currentUser.presence.customMessage,
      updatedAt: new Date().toISOString()
    };
    updateProfile({ presence: updatedPresence });
  };

  const updatePresenceVisibility = (visibility: UserPresence['visibility']) => {
    if (!currentUser) return;
    const updatedPresence: UserPresence = {
      ...currentUser.presence,
      visibility,
      updatedAt: new Date().toISOString()
    };
    updateProfile({ presence: updatedPresence });
  };

  const setAppLockPin = (pin: string | null, timeoutMinutes = 0) => {
    setLockPin(pin);
    setLockTimeoutMinutes(timeoutMinutes);
    if (pin) {
      saveItem(STORES.SETTINGS, 'auth_lock', { pin, timeoutMinutes }).catch(() => {});
    } else {
      deleteItem(STORES.SETTINGS, 'auth_lock').catch(() => {});
      setIsLocked(false);
    }
  };

  const unlockApp = (pinInput: string): boolean => {
    if (!lockPin || pinInput === lockPin) {
      setIsLocked(false);
      return true;
    }
    return false;
  };

  const lockAppNow = () => {
    if (lockPin) {
      setIsLocked(true);
    }
  };

  const logout = () => {
    deleteItem(STORES.SETTINGS, 'auth_user').catch(() => {});
    deleteItem(STORES.SETTINGS, 'auth_keys').catch(() => {});
    deleteItem(STORES.SETTINGS, 'auth_devices').catch(() => {});
    try {
      localStorage.removeItem(STORAGE_KEY_USER);
      localStorage.removeItem(STORAGE_KEY_KEYS);
      localStorage.removeItem(STORAGE_KEY_DEVICES);
    } catch {}
    setCurrentUser(null);
    setDeviceKeys(null);
    setConnectedDevices([]);
    setHasCompletedOnboarding(false);
  };

  const revokeDevice = (deviceId: string) => {
    const updated = connectedDevices.filter(d => d.id !== deviceId);
    setConnectedDevices(updated);
    saveItem(STORES.SETTINGS, 'auth_devices', updated).catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        hasCompletedOnboarding,
        isLoading,
        deviceKeys,
        connectedDevices,
        isLocked,
        lockPin,
        lockTimeoutMinutes,
        completeOnboarding,
        recoverAccount,
        updateProfile,
        updatePresence,
        updatePresenceVisibility,
        setAppLockPin,
        unlockApp,
        lockAppNow,
        logout,
        revokeDevice
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
