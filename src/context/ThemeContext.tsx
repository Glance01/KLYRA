import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  ThemeMode, 
  AccentPresetId, 
  AccentColorConfig, 
  PersonalizationSettings,
  FontSizeOption,
  RadiusOption,
  DensityOption,
  BubbleStyle,
  LanguageOption,
  UserProfile
} from '../types';
import { syncPersonalizationToFirestore, fetchPersonalizationFromFirestore } from '../services/firestoreSyncService';
import { getItem, saveItem, deleteItem, STORES } from '../services/storageService';
import { translate } from '../utils/translations';

export const ACCENT_PRESETS: Record<AccentPresetId, AccentColorConfig> = {
  blue: {
    id: 'blue',
    name: 'Azul Pacífico',
    hex: '#2563EB',
    hoverHex: '#1D4ED8',
    subtleHex: 'rgba(37, 99, 235, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  lavender: {
    id: 'lavender',
    name: 'Lavanda',
    hex: '#8B5CF6',
    hoverHex: '#7C3AED',
    subtleHex: 'rgba(139, 92, 246, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  purple: {
    id: 'purple',
    name: 'Roxo Imperial',
    hex: '#A855F7',
    hoverHex: '#9333EA',
    subtleHex: 'rgba(168, 85, 247, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  cyan: {
    id: 'cyan',
    name: 'Ciano Noturno',
    hex: '#06B6D4',
    hoverHex: '#0891B2',
    subtleHex: 'rgba(6, 182, 212, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  emerald: {
    id: 'emerald',
    name: 'Verde Botânico',
    hex: '#10B981',
    hoverHex: '#059669',
    subtleHex: 'rgba(16, 185, 129, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  rose: {
    id: 'rose',
    name: 'Rosa Pétala',
    hex: '#F43F5E',
    hoverHex: '#E11D48',
    subtleHex: 'rgba(244, 63, 94, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  ruby: {
    id: 'ruby',
    name: 'Vermelho Carmesim',
    hex: '#EF4444',
    hoverHex: '#DC2626',
    subtleHex: 'rgba(239, 68, 68, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  amber: {
    id: 'amber',
    name: 'Laranja Crepúsculo',
    hex: '#F97316',
    hoverHex: '#EA580C',
    subtleHex: 'rgba(249, 115, 22, 0.12)',
    textOnAccent: '#FFFFFF'
  },
  sand: {
    id: 'sand',
    name: 'Amarelo Ocre',
    hex: '#EAB308',
    hoverHex: '#CA8A04',
    subtleHex: 'rgba(234, 179, 8, 0.14)',
    textOnAccent: '#111827'
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monocromático',
    hex: '#475569',
    hoverHex: '#334155',
    subtleHex: 'rgba(71, 85, 105, 0.14)',
    textOnAccent: '#FFFFFF'
  },
  custom: {
    id: 'custom',
    name: 'Personalizada',
    hex: '#3B82F6',
    hoverHex: '#2563EB',
    subtleHex: 'rgba(59, 130, 246, 0.12)',
    textOnAccent: '#FFFFFF'
  }
};

const DEFAULT_SETTINGS: PersonalizationSettings = {
  themeMode: 'auto',
  accent: 'blue',
  customAccentHex: '#3B82F6',
  fontSize: 'base',
  radius: 'medium',
  density: 'comfortable',
  bubbleStyle: 'minimal',
  enableAnimations: true,
  soundEnabled: true,
  language: 'pt-BR'
};

export const STORAGE_KEY_THEME = 'theme';
export const STORAGE_KEY_PERSONALIZATION = 'senda_personalization';

interface ThemeContextType {
  settings: PersonalizationSettings;
  themeMode: ThemeMode;
  effectiveTheme: 'light' | 'dark';
  currentAccent: AccentColorConfig;
  isSavingToCloud: boolean;
  saveStatus: string | null;
  t: (key: string, fallback?: string) => string;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setAccent: (accent: AccentPresetId, customHex?: string) => void;
  setFontSize: (size: FontSizeOption) => void;
  setRadius: (radius: RadiusOption) => void;
  setDensity: (density: DensityOption) => void;
  setBubbleStyle: (style: BubbleStyle) => void;
  setLanguage: (language: LanguageOption) => void;
  toggleAnimations: (enabled: boolean) => void;
  toggleSound: (enabled: boolean) => void;
  savePersonalizationToCloud: (userId?: string) => Promise<boolean>;
  loadPersonalizationFromCloud: (userId: string) => Promise<void>;
  resetToDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<PersonalizationSettings>(DEFAULT_SETTINGS);

  // Load personalization from IndexedDB and purge legacy localStorage on boot
  useEffect(() => {
    const loadCachedSettings = async () => {
      try {
        let loadedSettings: PersonalizationSettings | null = await getItem(STORES.SETTINGS, 'theme_settings');

        // Check legacy localStorage if not found in IndexedDB
        if (!loadedSettings) {
          const explicitTheme = localStorage.getItem(STORAGE_KEY_THEME);
          const stored = localStorage.getItem(STORAGE_KEY_PERSONALIZATION);
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              loadedSettings = { ...DEFAULT_SETTINGS, ...parsed };
            } catch {}
          }
          if (explicitTheme === 'light' || explicitTheme === 'dark') {
            loadedSettings = loadedSettings || { ...DEFAULT_SETTINGS };
            loadedSettings.themeMode = explicitTheme;
          }
        }

        // Always purge localStorage
        try {
          localStorage.removeItem(STORAGE_KEY_THEME);
          localStorage.removeItem(STORAGE_KEY_PERSONALIZATION);
        } catch {}

        if (loadedSettings) {
          setSettings(loadedSettings);
          await saveItem(STORES.SETTINGS, 'theme_settings', loadedSettings);
        }

        // Also check if logged in user has cloud preferences
        const currentUser = await getItem<UserProfile>(STORES.SETTINGS, 'auth_user');
        if (currentUser?.id) {
          loadPersonalizationFromCloud(currentUser.id);
        }
      } catch (err) {
        console.warn('Erro ao carregar configurações de tema:', err);
      }
    };

    loadCachedSettings();
  }, []);

  const [systemIsDark, setSystemIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return true; // default dark for privacy & battery
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  const effectiveTheme: 'light' | 'dark' = 
    settings.themeMode === 'auto' 
      ? (systemIsDark ? 'dark' : 'light') 
      : settings.themeMode;

  const currentAccent: AccentColorConfig = 
    settings.accent === 'custom' && settings.customAccentHex
      ? {
          id: 'custom',
          name: 'Personalizada',
          hex: settings.customAccentHex,
          hoverHex: settings.customAccentHex,
          subtleHex: `${settings.customAccentHex}22`,
          textOnAccent: '#FFFFFF'
        }
      : ACCENT_PRESETS[settings.accent] || ACCENT_PRESETS.blue;

  useEffect(() => {
    // Persist settings in IndexedDB (zero localStorage)
    saveItem(STORES.SETTINGS, 'theme_settings', settings).catch(() => {});

    // Apply CSS Variables to Document Root
    const root = document.documentElement;
    
    // Theme class
    if (effectiveTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Dynamic accent color tokens
    root.style.setProperty('--senda-accent', currentAccent.hex);
    root.style.setProperty('--senda-accent-hover', currentAccent.hoverHex);
    root.style.setProperty('--senda-accent-subtle', currentAccent.subtleHex);
    root.style.setProperty('--senda-accent-text', currentAccent.textOnAccent);

    // Dynamic radius
    const radiusMap: Record<RadiusOption, string> = {
      sharp: '4px',
      medium: '10px',
      rounded: '16px'
    };
    root.style.setProperty('--app-radius', radiusMap[settings.radius] || '10px');

    // Font size root scaling
    const fontMap: Record<FontSizeOption, string> = {
      sm: '14px',
      base: '15px',
      lg: '16.5px'
    };
    root.style.fontSize = fontMap[settings.fontSize] || '15px';
  }, [settings, effectiveTheme, currentAccent]);

  const [isSavingToCloud, setIsSavingToCloud] = useState<boolean>(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const updateSetting = <K extends keyof PersonalizationSettings>(key: K, value: PersonalizationSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const setLanguage = (language: LanguageOption) => updateSetting('language', language);

  const savePersonalizationToCloud = async (userId?: string): Promise<boolean> => {
    try {
      setIsSavingToCloud(true);
      setSaveStatus(null);
      
      // Try to get logged in user profile from IndexedDB if userId is not passed
      let targetUserId = userId;
      if (!targetUserId) {
        const currentUser = await getItem<UserProfile>(STORES.SETTINGS, 'auth_user');
        if (currentUser?.id) {
          targetUserId = currentUser.id;
        }
      }

      if (!targetUserId) {
        targetUserId = 'anonymous_local_user';
      }

      await syncPersonalizationToFirestore(targetUserId, settings);
      setSaveStatus('Alterações salvas na nuvem com sucesso!');
      setTimeout(() => setSaveStatus(null), 4000);
      return true;
    } catch (err) {
      console.error('Erro ao salvar personalização na nuvem:', err);
      setSaveStatus('Erro ao salvar na nuvem. Verifique a conexão.');
      setTimeout(() => setSaveStatus(null), 4000);
      return false;
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const loadPersonalizationFromCloud = async (userId: string): Promise<void> => {
    if (!userId) return;
    try {
      const cloudSettings = await fetchPersonalizationFromFirestore(userId);
      if (cloudSettings) {
        setSettings(prev => ({ ...prev, ...cloudSettings }));
      }
    } catch (err) {
      console.warn('Erro ao carregar personalização do Firestore:', err);
    }
  };

  const setThemeMode = (themeMode: ThemeMode) => {
    updateSetting('themeMode', themeMode);
  };

  const setTheme = (theme: 'light' | 'dark') => {
    setThemeMode(theme);
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = effectiveTheme === 'dark' ? 'light' : 'dark';
    setThemeMode(nextTheme);
  };
  
  const setAccent = (accent: AccentPresetId, customHex?: string) => {
    setSettings(prev => ({
      ...prev,
      accent,
      ...(customHex ? { customAccentHex: customHex } : {})
    }));
  };

  const setFontSize = (fontSize: FontSizeOption) => updateSetting('fontSize', fontSize);
  const setRadius = (radius: RadiusOption) => updateSetting('radius', radius);
  const setDensity = (density: DensityOption) => updateSetting('density', density);
  const setBubbleStyle = (bubbleStyle: BubbleStyle) => updateSetting('bubbleStyle', bubbleStyle);
  const toggleAnimations = (enableAnimations: boolean) => updateSetting('enableAnimations', enableAnimations);
  const toggleSound = (soundEnabled: boolean) => updateSetting('soundEnabled', soundEnabled);
  
  const t = (key: string, fallback?: string): string => {
    return translate(settings.language || 'pt-BR', key, fallback);
  };

  const resetToDefaults = () => {
    deleteItem(STORES.SETTINGS, 'theme_settings').catch(() => {});
    try {
      localStorage.removeItem(STORAGE_KEY_THEME);
      localStorage.removeItem(STORAGE_KEY_PERSONALIZATION);
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  };

  return (
    <ThemeContext.Provider
      value={{
        settings,
        themeMode: settings.themeMode,
        effectiveTheme,
        currentAccent,
        isSavingToCloud,
        saveStatus,
        t,
        setThemeMode,
        toggleTheme,
        setTheme,
        setAccent,
        setFontSize,
        setRadius,
        setDensity,
        setBubbleStyle,
        setLanguage,
        toggleAnimations,
        toggleSound,
        savePersonalizationToCloud,
        loadPersonalizationFromCloud,
        resetToDefaults
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
