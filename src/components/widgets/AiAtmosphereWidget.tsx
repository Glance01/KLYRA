import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { 
  Sun, 
  Moon, 
  Clock as ClockIcon, 
  BookOpen, 
  UserCheck, 
  Sparkles, 
  RefreshCw, 
  SlidersHorizontal,
  X,
  ChevronRight,
  Volume2,
  VolumeX,
  Hourglass,
  Maximize2,
  PartyPopper,
  Gift,
  CheckCircle2,
  CloudRain,
  Wind,
  Cloud,
  EyeOff,
  Eye,
  Power
} from 'lucide-react';

export type WidgetMode = 'auto' | 'celestial' | 'clock' | 'story' | 'biography';
export type WeatherType = 'auto' | 'sun' | 'rain' | 'wind' | 'night' | 'cloudy';

interface AiAtmosphereWidgetProps {
  className?: string;
}

const THIRTY_MINUTES_MS = 30 * 60 * 1000;
const THIRTY_SECONDS_MS = 30 * 1000;

// Helper to get random item from array without repeating immediately
const getRandomItem = <T,>(arr: T[], lastUsed: T | null): T => {
  const filtered = arr.filter(item => item !== lastUsed);
  if (filtered.length === 0) return arr[Math.floor(Math.random() * arr.length)];
  return filtered[Math.floor(Math.random() * filtered.length)];
};

const FALLBACK_STORIES = [
  "O orvalho da manhã toca as folhas em silêncio. Cada novo dia no SENDA é uma página em branco pronta para conexões genuínas e profundas. No ritmo sereno da vida, os encontros mais significativos acontecem quando permitimos que o tempo flua sem pressa.",
  "Ao cair do sol, o horizonte se pinta em tons dourados. No silêncio dos pensamentos, nascem as ideias mais profundas e as amizades mais verdadeiras. A clareza surge do espaço tranquilo que criamos para nós mesmos.",
  "Estrelas distantes iluminam a quietude da noite. A verdadeira privacidade é ter um espaço seguro para ser você mesmo, onde cada palavra partilhada guarda o valor da confiança.",
  "O tempo corre como um rio sereno. Valorize cada conversa verdadeira com as pessoas que iluminam sua caminhada e constroem pontes de sabedoria."
];

const FALLBACK_BIOGRAPHIES = [
  {
    author: "Ada Lovelace",
    role: "Pioneira da Computação & Visionária",
    quote: "Aqueles que aprenderam a pensar por si mesmos encontrarão sempre a luz da verdade.",
    reflection: "Lovelace imaginou o potencial dos algoritmos muito além dos números. Ela nos ensina a enxergar conexões poéticas entre a tecnologia, a arte e a mente humana."
  },
  {
    author: "Marcus Aurelius",
    role: "Imperador & Filósofo Estoico",
    quote: "A qualidade da sua vida depende da qualidade dos seus pensamentos.",
    reflection: "Em meio às responsabilidades do mundo, o imperador reservava momentos para a introspecção diária, cultivando a paz interior diante do caos externo."
  },
  {
    author: "Marie Curie",
    role: "Física, Química & Cientista Nobreada",
    quote: "Nada na vida deve ser temido, apenas compreendido. Agora é a hora de compreender mais.",
    reflection: "Sua dedicação incansável à descoberta científica transformou a medicina moderna e inspirou gerações a perseguirem a verdade sem medo."
  },
  {
    author: "Leonardo da Vinci",
    role: "Polímata, Pintor & Inventor",
    quote: "A simplicidade é o último grau de sofisticação.",
    reflection: "Da Vinci observava a natureza com curiosidade sem limites, provando que a verdadeira inovação nasce da atenção profunda aos detalhes do cotidiano."
  }
];

// In-memory runtime cache for atmosphere content to eliminate localStorage
const atmosphereMemoryCache = new Map<string, string>();
const getAtmosphereCache = (k: string) => atmosphereMemoryCache.get(k) || null;
const setAtmosphereCache = (k: string, v: string) => atmosphereMemoryCache.set(k, v);
const removeAtmosphereCache = (k: string) => atmosphereMemoryCache.delete(k);

export const AiAtmosphereWidget: React.FC<AiAtmosphereWidgetProps> = ({ className = '' }) => {
  const { t, settings } = useTheme();
  const { currentUser } = useAuth();
  const [selectedMode, setSelectedMode] = useState<WidgetMode>('auto');
  const [activeSubMode, setActiveSubMode] = useState<'celestial' | 'clock' | 'story' | 'biography'>('celestial');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [readerModalType, setReaderModalType] = useState<'story' | 'biography' | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Weather Condition & Widget Enabled/Disabled State in memory
  const [weatherCondition, setWeatherCondition] = useState<WeatherType>('auto');
  const [isWidgetDisabled, setIsWidgetDisabled] = useState<boolean>(false);

  const changeWeather = (newWeather: WeatherType) => {
    setWeatherCondition(newWeather);
    setAtmosphereCache('senda_weather_condition', newWeather);
  };

  const toggleDisableWidget = (disabled: boolean) => {
    setIsWidgetDisabled(disabled);
    setAtmosphereCache('senda_widget_disabled', String(disabled));
  };

  // Welcome / Celebration for New Account State (30 seconds)
  const [isWelcomeActive, setIsWelcomeActive] = useState<boolean>(false);
  const [msToWelcomeEnd, setMsToWelcomeEnd] = useState<number>(0);
  const WELCOME_DURATION_MS = 30 * 1000;

  // Audio / Speech State
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Body Scroll Lock for Modal and Reader Views (solves mobile scroll trap)
  useEffect(() => {
    const isAnyOpen = isModalOpen || readerModalType !== null;
    if (isAnyOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isModalOpen, readerModalType]);

  // Content & Timers
  const [storyContent, setStoryContent] = useState<string>(FALLBACK_STORIES[0]);
  const [bioContent, setBioContent] = useState<typeof FALLBACK_BIOGRAPHIES[0]>(FALLBACK_BIOGRAPHIES[0]);
  const [isLoadingAi, setIsLoadingAi] = useState<boolean>(false);

  // Welcome Celebration 5-Minute Timer & Account Tracking
  useEffect(() => {
    if (!currentUser?.id) {
      setIsWelcomeActive(false);
      return;
    }

    const finishedKey = `senda_welcome_finished_${currentUser.id}`;
    if (getAtmosphereCache(finishedKey) === 'true') {
      setIsWelcomeActive(false);
      return;
    }

    const startKey = `senda_welcome_start_${currentUser.id}`;
    let startMs = Number(getAtmosphereCache(startKey));

    if (!startMs || isNaN(startMs)) {
      startMs = currentUser.createdAt ? new Date(currentUser.createdAt).getTime() : Date.now();
      setAtmosphereCache(startKey, String(startMs));
    }

    const checkWelcome = () => {
      const elapsed = Date.now() - startMs;
      if (elapsed >= WELCOME_DURATION_MS) {
        setAtmosphereCache(finishedKey, 'true');
        setIsWelcomeActive(false);
      } else {
        setIsWelcomeActive(true);
        setMsToWelcomeEnd(WELCOME_DURATION_MS - elapsed);
      }
    };

    checkWelcome();
    const interval = setInterval(checkWelcome, 1000);
    return () => clearInterval(interval);
  }, [currentUser?.id, currentUser?.createdAt]);

  const dismissWelcome = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (currentUser?.id) {
      setAtmosphereCache(`senda_welcome_finished_${currentUser.id}`, 'true');
    }
    setIsWelcomeActive(false);
  };

  const formatTimeRemainingWelcome = () => {
    const totalSecs = Math.floor(msToWelcomeEnd / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Bucket Calculations
  const nowMs = currentTime.getTime();
  const storyBucket = Math.floor(nowMs / THIRTY_MINUTES_MS);
  const bioBucket = Math.floor(nowMs / THIRTY_SECONDS_MS);

  const nextStoryTimeMs = (storyBucket + 1) * THIRTY_MINUTES_MS;
  const nextBioTimeMs = (bioBucket + 1) * THIRTY_SECONDS_MS;

  const msToNextStory = Math.max(0, nextStoryTimeMs - nowMs);
  const msToNextBio = Math.max(0, nextBioTimeMs - nowMs);

  // Format Remaining Story Time (5 hours update cycle)
  const formatTimeRemainingStory = () => {
    const totalSecs = Math.floor(msToNextStory / 1000);
    const hours = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    return `${hours}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Format Remaining Biography Time (15 minutes update cycle)
  const formatTimeRemainingBio = () => {
    const totalSecs = Math.floor(msToNextBio / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
  };

  // Time & Period logic
  const hour = currentTime.getHours();
  const isNight = hour < 6 || hour >= 18;
  const period = hour >= 5 && hour < 12 ? 'manhã' : hour >= 12 && hour < 18 ? 'tarde' : 'noite';

  const getActiveWeather = (): 'sun' | 'night' | 'rain' | 'wind' | 'cloudy' => {
    if (weatherCondition !== 'auto') {
      return weatherCondition;
    }
    return isNight ? 'night' : 'sun';
  };

  const activeWeather = getActiveWeather();

  // Clock Ticker
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Story Update Handler (Every 30 Minutes or when bucket changes)
  useEffect(() => {
    const storageKey = `senda_story_30m_${storyBucket}`;
    const cachedStory = getAtmosphereCache(storageKey);

    if (cachedStory) {
      setStoryContent(cachedStory);
    } else {
      // Fetch new 30-minute story
      fetchAiContent('story', storageKey);
    }
  }, [storyBucket]);

  // Biography Update Handler (Every 30 Seconds or when bucket changes)
  useEffect(() => {
    const storageKey = `senda_bio_30s_${bioBucket}`;
    const cachedBio = getAtmosphereCache(storageKey);

    if (cachedBio) {
      try {
        setBioContent(JSON.parse(cachedBio));
      } catch {
        setBioContent(getRandomItem(FALLBACK_BIOGRAPHIES, bioContent));
      }
    } else {
      // Fetch new 30-second biography
      fetchAiContent('biography', storageKey);
    }
  }, [bioBucket]);

  // Auto Rotation Loop Removed

  // Fetch AI Atmosphere Content with storage fallback
  const fetchAiContent = async (type: 'story' | 'biography', storageKey?: string) => {
    setIsLoadingAi(true);
    try {
      const res = await fetch('/api/gemini/atmosphere', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          language: settings?.language || 'pt-BR',
          period
        })
      });

      const data = await res.json();
      if (data.success && data.text) {
        if (type === 'story') {
          const text = data.text.trim();
          setStoryContent(text);
          if (storageKey) setAtmosphereCache(storageKey, text);
        } else if (type === 'biography') {
          const raw = data.text.trim();
          const newBio = {
            author: 'Inspiração do Momento',
            role: 'Visionário & Pensador',
            quote: raw,
            reflection: 'Atualizado automaticamente a cada 15 minutos com sabedoria histórica e reflexão do dia.'
          };
          setBioContent(newBio);
          if (storageKey) setAtmosphereCache(storageKey, JSON.stringify(newBio));
        }
      } else {
        if (type === 'story') {
          const fallbackText = getRandomItem(FALLBACK_STORIES, storyContent);
          setStoryContent(fallbackText);
          if (storageKey) setAtmosphereCache(storageKey, fallbackText);
        } else {
          const fallbackBio = getRandomItem(FALLBACK_BIOGRAPHIES, bioContent);
          setBioContent(fallbackBio);
          if (storageKey) setAtmosphereCache(storageKey, JSON.stringify(fallbackBio));
        }
      }
    } catch (err) {
      console.warn('[AI Widget] Usando conteúdo local:', err);
      if (type === 'story') {
        const fallbackText = getRandomItem(FALLBACK_STORIES, storyContent);
        setStoryContent(fallbackText);
        if (storageKey) setAtmosphereCache(storageKey, fallbackText);
      } else {
        const fallbackBio = getRandomItem(FALLBACK_BIOGRAPHIES, bioContent);
        setBioContent(fallbackBio);
        if (storageKey) setAtmosphereCache(storageKey, JSON.stringify(fallbackBio));
      }
    } finally {
      setIsLoadingAi(false);
    }
  };

  // Text-to-Speech Narrator
  const toggleSpeech = (textToRead: string) => {
    if (!('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(textToRead);
      utterance.lang = settings?.language === 'en-US' ? 'en-US' : settings?.language === 'es-ES' ? 'es-ES' : 'pt-BR';
      utterance.rate = 0.95;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Cleanup speech on modal close
  useEffect(() => {
    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const formatClockDigits = () => {
    const hoursStr = String(currentTime.getHours()).padStart(2, '0');
    const minsStr = String(currentTime.getMinutes()).padStart(2, '0');
    const secsStr = String(currentTime.getSeconds()).padStart(2, '0');
    return { hoursStr, minsStr, secsStr };
  };

  const { hoursStr, minsStr, secsStr } = formatClockDigits();
  const dateStr = currentTime.toLocaleDateString(settings?.language || 'pt-BR', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });

  if (isWidgetDisabled) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-2xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-500 dark:text-neutral-400 ${className}`}>
        <div className="flex items-center gap-2">
          <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
          <span className="font-medium text-xs">Card de Atmosfera Oculto</span>
        </div>
        <button
          type="button"
          onClick={() => toggleDisableWidget(false)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold text-xs hover:bg-[var(--senda-accent)]/20 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" /> Reativar Card
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Interactive Main Widget Banner */}
      <div
        onClick={() => setIsModalOpen(true)}
        className={`group relative overflow-hidden rounded-2xl p-3.5 sm:p-4 bg-gradient-to-br from-white via-neutral-50 to-neutral-100 dark:from-[#15181C] dark:via-[#121518] dark:to-[#0E1013] border border-neutral-200/80 dark:border-neutral-800 shadow-xs hover:shadow-md hover:border-[var(--senda-accent,#2563EB)]/50 transition-all cursor-pointer select-none ${className}`}
      >
        {/* Glow ambient background effect */}
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[var(--senda-accent)]/10 blur-xl group-hover:bg-[var(--senda-accent)]/20 transition-all pointer-events-none" />

        {/* Rain Drops Overlay Animation */}
        {activeWeather === 'rain' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-0">
            {[...Array(14)].map((_, i) => (
              <motion.div
                key={`rain-drop-${i}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: [ -10, 110 ], opacity: [0, 0.7, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 0.7 + (i % 4) * 0.2,
                  ease: 'linear',
                  delay: (i * 0.15) % 1.2,
                }}
                style={{ left: `${(i * 7) + 3}%` }}
                className="absolute w-[1.5px] h-3.5 bg-cyan-400/70 dark:bg-cyan-300/70 rounded-full"
              />
            ))}
          </div>
        )}

        {/* Wind Gusts Overlay Animation */}
        {activeWeather === 'wind' && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-2xl z-0">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={`wind-line-${i}`}
                initial={{ x: '-30%', opacity: 0 }}
                animate={{ x: [ '-30%', '120%' ], opacity: [0, 0.6, 0.8, 0] }}
                transition={{
                  repeat: Infinity,
                  duration: 2.0 + (i % 3) * 0.6,
                  ease: 'easeInOut',
                  delay: i * 0.45,
                }}
                style={{ top: `${15 + i * 15}%` }}
                className="absolute h-[1.5px] w-20 bg-gradient-to-r from-transparent via-teal-400/60 dark:via-teal-300/60 to-transparent rounded-full blur-[0.3px]"
              />
            ))}
          </div>
        )}

        {/* Top Header Badge & Selector Indicator */}
        <div className="flex items-center justify-between gap-2 mb-2">
          {isWelcomeActive ? (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-semibold border border-amber-500/20">
              <PartyPopper className="w-3 h-3 animate-bounce" />
              <span className="uppercase tracking-wider">🎉 BOAS-VINDAS</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-200/60 dark:bg-neutral-800/80 text-[10px] font-semibold text-neutral-600 dark:text-neutral-300">
              <Sparkles className="w-3 h-3 text-[var(--senda-accent)] animate-pulse" />
              <span className="uppercase tracking-wider">
                {selectedMode === 'auto' ? 'Atmosfera' : selectedMode === 'celestial' ? 'Atmosfera' : selectedMode === 'clock' ? 'Relógio' : selectedMode === 'story' ? 'História (5h)' : 'Biografia (15m)'}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            {isWelcomeActive ? (
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                muda em {formatTimeRemainingWelcome()}
              </span>
            ) : (
              <>
                {activeSubMode === 'story' && (
                  <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                    muda em {formatTimeRemainingStory()}
                  </span>
                )}
                {activeSubMode === 'biography' && (
                  <span className="text-[10px] font-mono text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                    muda em {formatTimeRemainingBio()}
                  </span>
                )}
              </>
            )}
            <div className="flex items-center gap-1 text-[11px] text-neutral-400 group-hover:text-[var(--senda-accent)] transition-colors">
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </div>
          </div>
        </div>

        {/* Animated Active Mode Content */}
        <AnimatePresence mode="wait">
          {isWelcomeActive ? (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 min-h-[52px]"
            >
              <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-500/20 via-purple-500/20 to-pink-500/20 border border-amber-500/30 text-amber-500 shrink-0 mt-0.5">
                <PartyPopper className="w-6 h-6 text-amber-500 animate-pulse" />
                <Sparkles className="w-3 h-3 text-purple-400 absolute -top-1 -right-1 animate-ping" />
              </div>

              <div className="flex-1 pr-1">
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>🎉 Seja muito bem-vindo(a), {currentUser?.displayName || 'membro'}!</span>
                  </h4>
                  <button
                    type="button"
                    onClick={dismissWelcome}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold transition-colors"
                  >
                    Entendido <X className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                  Sua conta no SENDA foi criada com sucesso! Esta celebração especial dura 30 segundos antes de iniciar a rotina habitual.
                </p>
              </div>
            </motion.div>
          ) : (
            <>
              {activeSubMode === 'celestial' && (
            <motion.div
              key="celestial"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between gap-3 min-h-[52px]"
            >
              <div className="flex items-center gap-3">
                <div className="relative flex items-center justify-center w-11 h-11 rounded-xl bg-amber-500/10 dark:bg-amber-400/10 border border-amber-500/20 text-amber-500 shrink-0">
                  {activeWeather === 'rain' ? (
                    <motion.div
                      animate={{ y: [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                    >
                      <CloudRain className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
                    </motion.div>
                  ) : activeWeather === 'wind' ? (
                    <motion.div
                      animate={{ x: [-2, 3, -2] }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                    >
                      <Wind className="w-6 h-6 text-teal-500 dark:text-teal-400" />
                    </motion.div>
                  ) : activeWeather === 'cloudy' ? (
                    <motion.div
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                    >
                      <Cloud className="w-6 h-6 text-slate-400" />
                    </motion.div>
                  ) : activeWeather === 'night' ? (
                    <motion.div
                      animate={{ rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
                    >
                      <Moon className="w-6 h-6 text-indigo-400" />
                    </motion.div>
                  ) : (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 20, ease: "linear" }}
                    >
                      <Sun className="w-6 h-6 text-amber-500" />
                    </motion.div>
                  )}
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[var(--senda-accent)] animate-ping opacity-75" />
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                    <span>
                      {activeWeather === 'rain'
                        ? 'Dia Chuvoso & Aconchegante'
                        : activeWeather === 'wind'
                        ? 'Vento Soprando & Brisa Fresca'
                        : activeWeather === 'cloudy'
                        ? 'Dia Nublado & Suave'
                        : activeWeather === 'night'
                        ? 'Atmosfera Noturna & Serenidade'
                        : hour < 12
                        ? 'Manhã Clara & Produtiva'
                        : 'Tarde Ensolarada & Foco'}
                    </span>
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 line-clamp-1">
                    {activeWeather === 'rain'
                      ? 'Chuva caindo • Ótimo para leitura e reflexão'
                      : activeWeather === 'wind'
                      ? 'Vento soprando • Ar limpo e renovador'
                      : activeWeather === 'cloudy'
                      ? 'Céu coberto • Clima suave e tranquilo'
                      : activeWeather === 'night'
                      ? 'Céu estrelado • Ritmo calmo para reflexão'
                      : hour < 12
                      ? 'Luz dourada • Energia para novas conexões'
                      : 'Tempo estável • Momento ideal para produzir'}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                  {activeWeather === 'rain'
                    ? '19°C • Chuva'
                    : activeWeather === 'wind'
                    ? '21°C • Ventoso'
                    : activeWeather === 'cloudy'
                    ? '22°C • Nublado'
                    : activeWeather === 'night'
                    ? '18°C • Estrelado'
                    : '26°C • Ensolarado'}
                </span>
                <p className="text-[10px] text-neutral-400 uppercase tracking-wider mt-0.5">SENDA Tempo</p>
              </div>
            </motion.div>
          )}

          {activeSubMode === 'clock' && (
            <motion.div
              key="clock"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex items-center justify-between gap-3 min-h-[52px]"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-[var(--senda-accent)]/10 border border-[var(--senda-accent)]/20 text-[var(--senda-accent)] shrink-0">
                  <ClockIcon className="w-6 h-6" />
                </div>

                <div>
                  <div className="flex items-baseline gap-1 font-mono font-bold text-lg text-neutral-900 dark:text-neutral-100 tracking-wider">
                    <span>{hoursStr}</span>
                    <span className="animate-pulse text-[var(--senda-accent)]">:</span>
                    <span>{minsStr}</span>
                    <span className="text-xs text-neutral-400 font-normal ml-1">:{secsStr}</span>
                  </div>
                  <p className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 capitalize">
                    {dateStr} • {period}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Ao vivo
                </span>
              </div>
            </motion.div>
          )}

          {activeSubMode === 'story' && (
            <motion.div
              key="story"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 min-h-[52px]"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-500 shrink-0 mt-0.5">
                <BookOpen className="w-5 h-5" />
              </div>

              <div className="flex-1 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> História Atual (Muda a cada 5h)
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReaderModalType('story');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 text-[10px] font-bold transition-colors"
                  >
                    Ler História <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 italic line-clamp-2 mt-0.5 leading-relaxed">
                  "{storyContent}"
                </p>
              </div>
            </motion.div>
          )}

          {activeSubMode === 'biography' && (
            <motion.div
              key="biography"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              className="flex items-start gap-3 min-h-[52px]"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-500 shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>

              <div className="flex-1 pr-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1">
                    {bioContent.author} <span className="text-[10px] font-normal text-neutral-400">• Biografia (15m)</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setReaderModalType('biography');
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-300 text-[10px] font-bold transition-colors"
                  >
                    Ler Biografia <Maximize2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200 font-medium line-clamp-1 mt-0.5">
                  "{bioContent.quote}"
                </p>
              </div>
            </motion.div>
          )}
        </>
      )}
    </AnimatePresence>
      </div>

      {/* Mode Switcher Modal Dialog */}
      <AnimatePresence>
        {isModalOpen && (
          <div 
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md max-h-[88vh] bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl flex flex-col overflow-hidden my-auto relative"
            >
              {/* Sticky Header */}
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 p-4 shrink-0 bg-white dark:bg-[#121518] z-10">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-xl shrink-0 ${isWelcomeActive ? 'bg-amber-500/10 text-amber-500 animate-bounce' : 'bg-[var(--senda-accent)]/10 text-[var(--senda-accent)]'}`}>
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 tracking-tight">
                      {isWelcomeActive ? '🎉 Bem-vindo ao SENDA!' : 'Atmosfera & Modos do Widget'}
                    </h3>
                    <p className="text-xs text-neutral-500">
                      {isWelcomeActive ? 'Sua nova conta está pronta.' : 'Escolha como deseja visualizar a informação'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Content Body with smooth mobile scrolling */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain touch-pan-y">
                {/* Welcome Celebration Banner inside modal if active */}
                {isWelcomeActive && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <PartyPopper className="w-5 h-5 text-amber-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                          🎉 Boas-Vindas à Nova Conta ({formatTimeRemainingWelcome()})
                        </p>
                        <p className="text-[10px] text-amber-600/80 dark:text-amber-400/80">
                          Celebração ativa durante 30 segundos.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        dismissWelcome(e);
                        setIsModalOpen(false);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors shrink-0"
                    >
                      Encerrar
                    </button>
                  </div>
                )}

                {/* Mode Options Grid */}
                <div className="space-y-2">
                  {/* Mode Option 1: Auto */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('auto');
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMode === 'auto'
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Modo Automático (IA Dynamic)
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Alterna dinamicamente entre sol/lua, relógio, história e biografia.
                        </p>
                      </div>
                    </div>
                    {selectedMode === 'auto' && <ChevronRight className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>

                  {/* Mode Option 2: Celestial */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('celestial');
                      setActiveSubMode('celestial');
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMode === 'celestial'
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
                        {isNight ? <Moon className="w-5 h-5 text-indigo-400" /> : <Sun className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Sol & Lua (Atmosfera Celeste)
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Animação do céu, sol e lua conforme a hora do dia.
                        </p>
                      </div>
                    </div>
                    {selectedMode === 'celestial' && <ChevronRight className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>

                  {/* Mode Option 3: Clock */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('clock');
                      setActiveSubMode('clock');
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMode === 'clock'
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                        <ClockIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Relógio Digital Ativo
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Relógio digital preciso em tempo real com segundos e data.
                        </p>
                      </div>
                    </div>
                    {selectedMode === 'clock' && <ChevronRight className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>

                  {/* Mode Option 4: Story */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('story');
                      setActiveSubMode('story');
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMode === 'story'
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-purple-500/10 text-purple-500">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          História Atual (Muda a cada 5 horas)
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Próxima atualização em: {formatTimeRemainingStory()}
                        </p>
                      </div>
                    </div>
                    {selectedMode === 'story' && <ChevronRight className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>

                  {/* Mode Option 5: Biography */}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedMode('biography');
                      setActiveSubMode('biography');
                      setIsModalOpen(false);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedMode === 'biography'
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 text-[var(--senda-accent)] font-semibold'
                        : 'border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 bg-neutral-50/50 dark:bg-neutral-900/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-500">
                        <UserCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                          Biografia Atual (Muda a cada 15 minutos)
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          Próxima atualização em: {formatTimeRemainingBio()}
                        </p>
                      </div>
                    </div>
                    {selectedMode === 'biography' && <ChevronRight className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>
                </div>

                {/* Weather Condition Selector Section */}
                <div className="p-3.5 rounded-xl bg-neutral-100/70 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        Previsão do Tempo / Clima
                      </h4>
                      <p className="text-[11px] text-neutral-500">
                        Escolha o clima para ativar efeitos visuais (chuva caindo, vento soprando, etc.)
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-1">
                    {([
                      { id: 'auto', label: 'Auto', icon: Sparkles, color: 'text-emerald-500' },
                      { id: 'sun', label: 'Sol', icon: Sun, color: 'text-amber-500' },
                      { id: 'rain', label: 'Chuva', icon: CloudRain, color: 'text-cyan-500' },
                      { id: 'wind', label: 'Vento', icon: Wind, color: 'text-teal-500' },
                      { id: 'night', label: 'Noite', icon: Moon, color: 'text-indigo-400' },
                      { id: 'cloudy', label: 'Nublado', icon: Cloud, color: 'text-slate-400' }
                    ] as const).map((item) => {
                      const IconComp = item.icon;
                      const isSelected = weatherCondition === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => changeWeather(item.id)}
                          className={`flex flex-col items-center justify-center p-2 rounded-lg border text-center transition-all ${
                            isSelected
                              ? 'border-[var(--senda-accent)] bg-[var(--senda-accent)]/10 font-bold shadow-2xs'
                              : 'border-neutral-200/80 dark:border-neutral-700/80 bg-white dark:bg-neutral-900 hover:border-neutral-300'
                          }`}
                        >
                          <IconComp className={`w-4 h-4 mb-1 ${item.color}`} />
                          <span className="text-[10px] text-neutral-800 dark:text-neutral-200">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Disable / Hide Card Option */}
                <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <EyeOff className="w-4 h-4 text-neutral-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                        Desativar este Card
                      </p>
                      <p className="text-[10px] text-neutral-500">
                        Oculta o card para quem prefere uma interface sem o painel.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      toggleDisableWidget(true);
                      setIsModalOpen(false);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold border border-red-500/20 transition-colors shrink-0 flex items-center gap-1.5"
                  >
                    <Power className="w-3.5 h-3.5" />
                    Desativar
                  </button>
                </div>

                {/* Reader Direct Actions */}
                <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-800/80 space-y-2">
                  <p className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                    Leitor Completo Imersivo:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setReaderModalType('story');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors"
                    >
                      <BookOpen className="w-4 h-4" /> Ler História
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setReaderModalType('biography');
                      }}
                      className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                    >
                      <UserCheck className="w-4 h-4" /> Ler Biografia
                    </button>
                  </div>
                </div>
              </div>

              {/* Sticky Bottom Footer Action */}
              <div className="p-3 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-5 py-2 rounded-xl bg-neutral-200 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold transition-colors"
                >
                  Fechar Janela
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reader Modal: STORY */}
      <AnimatePresence>
        {readerModalType === 'story' && (
          <div 
            onClick={() => {
              setReaderModalType(null);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg max-h-[88vh] bg-white dark:bg-[#121518] rounded-3xl border border-purple-500/30 shadow-2xl flex flex-col overflow-hidden my-auto relative"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 p-5 shrink-0 bg-white dark:bg-[#121518]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        História Atual SENDA
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 text-[10px] font-semibold">
                        Renova a cada 5h
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Hourglass className="w-3 h-3 text-purple-500 animate-pulse" />
                      <span>Próxima história em: <strong>{formatTimeRemainingStory()}</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReaderModalType(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body with smooth mobile scrolling */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {/* Story Content Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/5 via-neutral-50 to-purple-500/10 dark:from-purple-950/20 dark:via-[#15181C] dark:to-neutral-900 border border-purple-500/20 space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-purple-600 dark:text-purple-400">
                    <span className="uppercase tracking-wider">Edição do Período ({period})</span>
                    <button
                      type="button"
                      onClick={() => toggleSpeech(storyContent)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-xs font-bold transition-colors"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4 text-purple-500 animate-pulse" /> Parar Narração
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-purple-500" /> Ouvir História
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-base text-neutral-800 dark:text-neutral-200 font-serif leading-relaxed italic">
                    "{storyContent}"
                  </p>
                </div>
              </div>

              {/* Reader Footer Controls */}
              <div className="flex items-center justify-between p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => {
                    const key = `senda_story_5h_${storyBucket}`;
                    removeAtmosphereCache(key);
                    fetchAiContent('story', key);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin text-purple-500' : ''}`} />
                  <span>Forçar Nova História</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReaderModalType(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reader Modal: BIOGRAPHY */}
      <AnimatePresence>
        {readerModalType === 'biography' && (
          <div 
            onClick={() => {
              setReaderModalType(null);
              if ('speechSynthesis' in window) window.speechSynthesis.cancel();
              setIsSpeaking(false);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto"
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg max-h-[88vh] bg-white dark:bg-[#121518] rounded-3xl border border-blue-500/30 shadow-2xl flex flex-col overflow-hidden my-auto relative"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 p-5 shrink-0 bg-white dark:bg-[#121518]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    <UserCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        Biografia Atual
                      </h3>
                      <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 text-[10px] font-semibold">
                        Renova a cada 15m
                      </span>
                    </div>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-0.5">
                      <Hourglass className="w-3 h-3 text-blue-500 animate-pulse" />
                      <span>Próxima biografia em: <strong>{formatTimeRemainingBio()}</strong></span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setReaderModalType(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }}
                  className="w-11 h-11 flex items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors shrink-0 cursor-pointer"
                  style={{ minWidth: '44px', minHeight: '44px' }}
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Scrollable Body with smooth mobile scrolling */}
              <div className="p-5 overflow-y-auto flex-1 space-y-4 overscroll-contain touch-pan-y">
                {/* Biography Content Box */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-500/5 via-neutral-50 to-blue-500/10 dark:from-blue-950/20 dark:via-[#15181C] dark:to-neutral-900 border border-blue-500/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {bioContent.author}
                      </h4>
                      <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                        {bioContent.role}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleSpeech(`${bioContent.author}. ${bioContent.quote}. ${bioContent.reflection}`)}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-xs font-bold text-blue-600 dark:text-blue-300 transition-colors"
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX className="w-4 h-4 text-blue-500 animate-pulse" /> Parar
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4 text-blue-500" /> Ouvir
                        </>
                      )}
                    </button>
                  </div>

                  <div className="p-3.5 rounded-xl bg-white/80 dark:bg-black/30 border border-neutral-200/60 dark:border-neutral-800">
                    <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 italic">
                      "{bioContent.quote}"
                    </p>
                  </div>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {bioContent.reflection}
                  </p>
                </div>
              </div>

              {/* Reader Footer Controls */}
              <div className="flex items-center justify-between p-4 border-t border-neutral-100 dark:border-neutral-800 shrink-0 bg-neutral-50 dark:bg-neutral-900/50">
                <button
                  type="button"
                  onClick={() => {
                    const key = `senda_bio_15m_${bioBucket}`;
                    removeAtmosphereCache(key);
                    fetchAiContent('biography', key);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAi ? 'animate-spin text-blue-500' : ''}`} />
                  <span>Forçar Nova Biografia</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setReaderModalType(null);
                    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
                    setIsSpeaking(false);
                  }}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
