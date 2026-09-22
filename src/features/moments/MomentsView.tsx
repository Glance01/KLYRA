import React, { useState, useRef, useCallback, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { INITIAL_MOMENTS } from '../../services/initialData';
import { SendaMoment, MomentType } from '../../types';
import { Avatar } from '../../components/ds/Avatar';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { MomentViewerModal } from './MomentViewerModal';
import { DeviceCameraCaptureModal } from '../../components/media/DeviceCameraCaptureModal';
import { processDeviceImageFile } from '../../services/storageService';
import { 
  Compass, 
  Plus, 
  Heart, 
  Eye, 
  Clock, 
  MapPin, 
  Play, 
  Pause, 
  Volume2, 
  Image as ImageIcon, 
  Type, 
  Shield, 
  X, 
  Check,
  Upload,
  Sparkles,
  Maximize2,
  Mic,
  Palette,
  Camera,
  Trash2
} from 'lucide-react';

export const MomentsView: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useTheme();
  const [moments, setMoments] = useState<SendaMoment[]>(INITIAL_MOMENTS);
  const [isCreating, setIsCreating] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Wipe legacy localStorage cache on startup
  useEffect(() => {
    try {
      localStorage.removeItem('senda_moments_cache');
    } catch {}
  }, []);

  // Real-time Firestore synchronization for Moments
  useEffect(() => {
    const momentsColRef = collection(db, 'moments');
    const unsubscribe = onSnapshot(momentsColRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial moments directly to Firestore
        for (const m of INITIAL_MOMENTS) {
          try {
            await setDoc(doc(db, 'moments', m.id), m, { merge: true });
          } catch {}
        }
      } else {
        const firestoreMoments: SendaMoment[] = [];
        snapshot.docs.forEach((docSnap) => {
          firestoreMoments.push(docSnap.data() as SendaMoment);
        });

        // Sort by createdTimestamp descending
        firestoreMoments.sort((a, b) => (b.createdTimestamp || 0) - (a.createdTimestamp || 0));
        setMoments(firestoreMoments);
      }
    }, (err) => {
      console.warn('[Firestore Moments Sync]:', err);
    });

    return () => unsubscribe();
  }, []);

  // Live ticker for remaining time
  React.useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatMomentRemainingTime = (m: SendaMoment) => {
    const createdMs = m.createdTimestamp || now - 3600 * 1000;
    const expiresMs = m.expiresAtMs || createdMs + m.expiresInHours * 3600 * 1000;
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

  const isMomentAuthor = (m: SendaMoment) => {
    if (!currentUser) return false;
    return (
      m.author.id === currentUser.id ||
      m.author.username === currentUser.username ||
      m.author.displayName === currentUser.displayName ||
      currentUser.id === 'usr_me'
    );
  };

  const handleDeleteMoment = async (id: string) => {
    setMoments((prev) => prev.filter((m) => m.id !== id));
    try {
      await deleteDoc(doc(db, 'moments', id));
    } catch (e) {
      console.warn('Erro ao remover momento do Firestore:', e);
    }

    setToastMessage('Momento eliminado com sucesso.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fullscreen stories viewer state
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(0);

  // New moment form state
  const [newType, setNewType] = useState<MomentType>('photo');
  const [newContent, setNewContent] = useState('');
  const [newMediaUrl, setNewMediaUrl] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [newExpirationHours, setNewExpirationHours] = useState(24);
  const [newPrivacy, setNewPrivacy] = useState<'all' | 'contacts' | 'only_me'>('contacts');
  const [newAccentColor, setNewAccentColor] = useState('#2563EB');
  const [audioDuration, setAudioDuration] = useState(12);
  const [audioRecorded, setAudioRecorded] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenViewer = (index: number) => {
    setViewerIndex(index);
    setViewerOpen(true);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Process and optimize image strictly from device
      const compressedDataUrl = await processDeviceImageFile(file, 1280, 1280, 0.85);
      setNewMediaUrl(compressedDataUrl);
    } catch (err) {
      console.warn('Erro ao processar imagem do dispositivo:', err);
    }
    e.target.value = '';
  };

  const handleCameraCapture = (imageDataUrl: string) => {
    setNewMediaUrl(imageDataUrl);
  };

  const handleCreateMoment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newContent.trim()) return;

    const createdTimestamp = Date.now();
    const expiresAtMs = createdTimestamp + newExpirationHours * 3600 * 1000;

    let finalMediaUrl = newMediaUrl.trim() || undefined;

    // If media is a device base64, upload to server so it is saved strictly as a link URL
    if (finalMediaUrl && finalMediaUrl.startsWith('data:')) {
      try {
        const uploadRes = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: newType === 'audio' ? 'audio' : 'image',
            data: finalMediaUrl
          })
        });
        const json = await uploadRes.json();
        if (json.success && json.url) {
          finalMediaUrl = json.url;
        }
      } catch (err) {
        console.warn('Erro ao carregar mídia para link URL:', err);
      }
    }

    const created: SendaMoment = {
      id: `mom_${createdTimestamp}`,
      author: currentUser,
      type: newType,
      content: newContent.trim(),
      mediaUrl: finalMediaUrl,
      audioDuration: newType === 'audio' ? audioDuration : undefined,
      audioWaveform: newType === 'audio' ? [25, 45, 80, 95, 60, 40, 70, 85, 50, 30] : undefined,
      locationName: newLocation.trim() || undefined,
      accentColor: newAccentColor,
      createdAt: 'Agora mesmo',
      createdTimestamp,
      expiresInHours: newExpirationHours,
      expiresAtMs,
      viewsCount: 1,
      likesCount: 0,
      privacy: newPrivacy
    };

    setMoments(prev => [created, ...prev]);
    setIsCreating(false);
    setNewContent('');
    setNewMediaUrl('');
    setNewLocation('');
    setAudioRecorded(false);

    // Persist directly to Cloud Firestore collection "moments"
    try {
      await setDoc(doc(db, 'moments', created.id), created);
    } catch (e) {
      console.warn('Erro ao salvar momento no Firestore:', e);
    }
  };

  const handleLike = useCallback((id: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;

    setMoments(prev => prev.map(m => {
      if (m.id !== id) return m;

      const likedBy = m.likedBy || [];
      const hasLiked = likedBy.includes(userId);

      let newLikedBy: string[];
      let newLikesCount: number;

      if (hasLiked) {
        newLikedBy = likedBy.filter(uid => uid !== userId);
        newLikesCount = Math.max(0, m.likesCount - 1);
      } else {
        newLikedBy = [...likedBy, userId];
        newLikesCount = m.likesCount + 1;
      }

      setDoc(doc(db, 'moments', id), {
        likedBy: newLikedBy,
        likesCount: newLikesCount
      }, { merge: true }).catch(() => {});

      return {
        ...m,
        likedBy: newLikedBy,
        likesCount: newLikesCount
      };
    }));
  }, [currentUser]);

  const handleViewMoment = useCallback((id: string) => {
    if (!currentUser) return;
    const userId = currentUser.id;

    setMoments(prev => prev.map(m => {
      if (m.id !== id) return m;

      const viewedBy = m.viewedBy || [];
      if (viewedBy.includes(userId)) {
        return m; // Already viewed by this user, do not increment
      }

      const updatedViewed = [...viewedBy, userId];
      const updatedCount = m.viewsCount + 1;

      setDoc(doc(db, 'moments', id), {
        viewedBy: updatedViewed,
        viewsCount: updatedCount
      }, { merge: true }).catch(() => {});

      return {
        ...m,
        viewedBy: updatedViewed,
        viewsCount: updatedCount
      };
    }));
  }, [currentUser]);

  return (
    <div className="w-full max-w-4xl lg:max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <Compass className="w-3.5 h-3.5" />
            <span>Acontecimentos & Registros</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('moments.title', 'Momentos')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('moments.subtitle', 'Histórias efêmeras, reflexões em áudio e imagens sem algoritmos de vigilância.')}
          </p>
        </div>

        <Button
          size="md"
          onClick={() => setIsCreating(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {t('moments.create', 'Novo Momento')}
        </Button>
      </div>

      {/* TOP STORIES BAR (Horizontal avatar carousel with story rings) */}
      <div className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 shadow-xs">
        <div className="flex items-center justify-between px-1 mb-3">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
            Momentos Recentes (24h)
          </span>
          <span className="text-[11px] text-neutral-400">
            {moments.length} ativos
          </span>
        </div>

        <div className="flex items-center gap-4 overflow-x-auto pb-2 pt-1 no-scrollbar select-none">
          {/* Create Moment Quick Ring for Current User */}
          <div 
            onClick={() => setIsCreating(true)}
            className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
          >
            <div className="relative w-15 h-15 rounded-full p-0.5 border-2 border-dashed border-neutral-300 dark:border-neutral-700 group-hover:border-[var(--senda-accent)] transition-colors flex items-center justify-center">
              <Avatar
                name={currentUser?.displayName || 'Eu'}
                src={currentUser?.avatarUrl}
                size="md"
                className="opacity-90"
              />
              <div className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-[var(--senda-accent)] text-white flex items-center justify-center shadow-xs">
                <Plus className="w-3.5 h-3.5" />
              </div>
            </div>
            <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[64px]">
              Meu Momento
            </span>
          </div>

          {/* Active Moments Rings */}
          {moments.map((moment, idx) => (
            <div
              key={moment.id}
              onClick={() => handleOpenViewer(idx)}
              className="flex flex-col items-center gap-1.5 shrink-0 cursor-pointer group"
            >
              <div className="relative w-15 h-15 rounded-full p-[2.5px] bg-gradient-to-tr from-amber-500 via-[var(--senda-accent)] to-indigo-500 hover:scale-105 active:scale-95 transition-all shadow-xs flex items-center justify-center">
                <div className="w-full h-full rounded-full p-0.5 bg-white dark:bg-[#121518] flex items-center justify-center">
                  <Avatar
                    name={moment.author.displayName}
                    src={moment.author.avatarUrl}
                    size="md"
                  />
                </div>
                {moment.type === 'audio' && (
                  <span className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-indigo-500 text-white flex items-center justify-center text-[9px] shadow-xs">
                    <Volume2 className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <span className="text-[11px] font-medium text-neutral-700 dark:text-neutral-300 truncate max-w-[68px] text-center">
                {moment.author.displayName?.split(' ')[0] || '...'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Feed of Content-First Cards */}
      <div className="space-y-6">
        {moments.map((moment, idx) => (
          <article
            key={moment.id}
            className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 sm:p-6 space-y-4 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors relative group"
          >
            {/* Author Header */}
            <div className="flex items-center justify-between">
              <div 
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => handleOpenViewer(idx)}
              >
                <div className="relative rounded-full p-0.5 bg-gradient-to-tr from-amber-500 to-[var(--senda-accent)]">
                  <Avatar
                    name={moment.author.displayName}
                    src={moment.author.avatarUrl}
                    presence={moment.author.presence?.status}
                    size="md"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 leading-tight">
                    {moment.author.displayName}
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">@{moment.author.username}</span>
                    <span>•</span>
                    <span 
                      className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-mono text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold whitespace-nowrap shrink-0"
                      title="Contagem regressiva verdadeira para eliminação automática"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                      <span>Expira em {formatMomentRemainingTime(moment)}</span>
                    </span>
                    {moment.locationName && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-0.5 text-neutral-500 dark:text-neutral-400">
                          <MapPin className="w-3 h-3 text-neutral-400" /> {moment.locationName}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Delete & Fullscreen Trigger */}
              <div className="flex items-center gap-1.5 shrink-0 self-start">
                {isMomentAuthor(moment) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMoment(moment.id);
                    }}
                    className="p-1.5 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                    title="Eliminar este momento (Autor)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Eliminar</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleOpenViewer(idx)}
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                  title="Ver em tela cheia"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content Body */}
            {moment.type === 'thought' ? (
              <div 
                onClick={() => handleOpenViewer(idx)}
                className="py-4 px-5 rounded-xl cursor-pointer transition-transform hover:scale-[1.01]"
                style={{
                  background: moment.accentColor 
                    ? `linear-gradient(135deg, ${moment.accentColor}18 0%, rgba(240,240,245,0.4) 100%)` 
                    : 'transparent'
                }}
              >
                <blockquote className="text-base sm:text-lg font-serif text-neutral-800 dark:text-neutral-200 leading-relaxed italic">
                  "{moment.content}"
                </blockquote>
              </div>
            ) : moment.type === 'photo' ? (
              <div className="space-y-3">
                {moment.mediaUrl && (
                  <div 
                    onClick={() => handleOpenViewer(idx)}
                    className="rounded-xl overflow-hidden max-h-96 bg-neutral-100 dark:bg-neutral-800 cursor-pointer"
                  >
                    <img
                      src={moment.mediaUrl}
                      alt="Momento visual"
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <p className="text-sm text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {moment.content}
                </p>
              </div>
            ) : moment.type === 'audio' ? (
              <div className="space-y-3 py-1">
                <p className="text-sm text-neutral-800 dark:text-neutral-200">
                  {moment.content}
                </p>

                {/* Audio snippet player */}
                <div className="p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-800/60 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPlayingAudioId(playingAudioId === moment.id ? null : moment.id)}
                    className="w-10 h-10 rounded-full bg-[var(--senda-accent)] text-white flex items-center justify-center shrink-0 shadow-xs cursor-pointer hover:opacity-90"
                  >
                    {playingAudioId === moment.id ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                  </button>

                  <div className="flex-1 flex items-center gap-1 h-8">
                    {(moment.audioWaveform || [20, 40, 70, 90, 60, 40, 60, 85, 45, 25]).map((val, bIdx) => (
                      <div
                        key={bIdx}
                        className={`w-1 rounded-full transition-all ${
                          playingAudioId === moment.id ? 'bg-[var(--senda-accent)] animate-pulse' : 'bg-neutral-300 dark:bg-neutral-600'
                        }`}
                        style={{ height: `${val * 0.3}px` }}
                      />
                    ))}
                  </div>

                  <span className="text-xs font-mono text-neutral-500">
                    0:{moment.audioDuration?.toString().padStart(2, '0') || '18'}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Card Footer Interactions */}
            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500">
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => handleLike(moment.id)}
                  className={`flex items-center gap-1.5 transition-colors cursor-pointer ${
                    currentUser && moment.likedBy?.includes(currentUser.id) 
                      ? 'text-rose-500 font-semibold' 
                      : 'hover:text-rose-500'
                  }`}
                >
                  <Heart 
                    className={`w-4 h-4 transition-colors ${
                      currentUser && moment.likedBy?.includes(currentUser.id) 
                        ? 'text-rose-500 fill-rose-500' 
                        : ''
                    }`} 
                  />
                  <span>{moment.likesCount} curtidas</span>
                </button>

                <div 
                  onClick={() => handleOpenViewer(idx)}
                  className="flex items-center gap-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 cursor-pointer"
                >
                  <Eye className="w-4 h-4" />
                  <span>{moment.viewsCount} visualizações</span>
                </div>
              </div>

              <div className="text-[11px] text-neutral-400">
                Privacidade: {moment.privacy === 'all' ? 'Pública' : moment.privacy === 'contacts' ? 'Contatos' : 'Apenas eu'}
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 px-4 py-2.5 rounded-xl shadow-2xl border border-white/20 text-xs font-semibold flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Fullscreen Stories Viewer Modal */}
      <MomentViewerModal
        isOpen={viewerOpen}
        initialIndex={viewerIndex}
        moments={moments}
        onClose={() => setViewerOpen(false)}
        onLikeMoment={handleLike}
        onViewMoment={handleViewMoment}
        onDeleteMoment={handleDeleteMoment}
      />

      {/* Create Moment Modal */}
      {isCreating && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsCreating(false)}
        >
          <div 
            className="w-full max-w-lg bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[var(--senda-accent)]" />
                <span>Compartilhar Novo Momento</span>
              </h2>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: 'thought' as const, label: 'Reflexão', icon: <Type className="w-4 h-4" /> },
                { type: 'photo' as const, label: 'Fotografia', icon: <ImageIcon className="w-4 h-4" /> },
                { type: 'audio' as const, label: 'Áudio Efêmero', icon: <Volume2 className="w-4 h-4" /> },
              ].map((item) => (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => setNewType(item.type)}
                  className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 text-xs font-medium transition-all cursor-pointer ${
                    newType === item.type
                      ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                      : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            <form onSubmit={handleCreateMoment} className="space-y-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  {newType === 'thought' ? 'Seu Pensamento ou Reflexão' : 'Legenda ou Descrição'}
                </label>
                <textarea
                  rows={3}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={
                    newType === 'thought'
                      ? 'Escreva uma reflexão, nota ou citação...'
                      : newType === 'photo'
                      ? 'Adicione uma legenda opcional para a imagem...'
                      : 'Dê um título ao áudio (ex: Reflexão sobre o dia)...'
                  }
                  required
                  className="w-full bg-neutral-100/90 dark:bg-neutral-900/90 text-sm text-neutral-900 dark:text-neutral-100 rounded-xl p-3 border border-neutral-200 dark:border-neutral-800 outline-none focus:border-[var(--senda-accent)]"
                />
              </div>

              {/* Photo Upload & Direct Camera Capture */}
              {newType === 'photo' && (
                <div className="space-y-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />

                  {newMediaUrl ? (
                    <div className="relative rounded-xl overflow-hidden max-h-56 border border-neutral-200 dark:border-neutral-800">
                      <img
                        src={newMediaUrl}
                        alt="Foto do dispositivo"
                        className="w-full h-56 object-cover"
                      />
                      <div className="absolute top-2 left-2 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-xs text-white text-[10px] font-medium flex items-center gap-1">
                        <Camera className="w-3 h-3 text-[var(--senda-accent)]" />
                        <span>Foto do dispositivo</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setNewMediaUrl('')}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        title="Remover foto"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* 1. Take Photo with Device Camera */}
                      <button
                        type="button"
                        onClick={() => setIsCameraOpen(true)}
                        className="border-2 border-dashed border-[var(--senda-accent)]/50 hover:border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)]/40 hover:bg-[var(--senda-accent-subtle)]/70 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-[var(--senda-accent)] text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <Camera className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Tirar Foto com a Câmera
                          </p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Capturar agora do dispositivo
                          </p>
                        </div>
                      </button>

                      {/* 2. Select from Device Gallery / Storage */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-neutral-300 dark:border-neutral-700 hover:border-neutral-400 dark:hover:border-neutral-600 bg-neutral-50 dark:bg-neutral-900/40 rounded-xl p-5 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 group"
                      >
                        <div className="w-10 h-10 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                          <Upload className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                            Escolher do Dispositivo
                          </p>
                          <p className="text-[10px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                            Galeria, arquivos ou rolo da câmera
                          </p>
                        </div>
                      </button>
                    </div>
                  )}

                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 bg-neutral-100/70 dark:bg-neutral-900/60 p-2.5 rounded-xl">
                    <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span>A foto permanece armazenada localmente no dispositivo (IndexedDB seguro).</span>
                  </div>
                </div>
              )}

              {/* Audio Voice Simulation */}
              {newType === 'audio' && (
                <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-[var(--senda-accent)] text-white flex items-center justify-center">
                        <Mic className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                          {audioRecorded ? 'Áudio Gravado com Sucesso' : 'Gravar Nota de Áudio'}
                        </p>
                        <p className="text-[10px] text-neutral-400">
                          {audioRecorded ? `${audioDuration} segundos capturados` : 'Clique abaixo para simular captação'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setAudioRecorded(!audioRecorded)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-[var(--senda-accent)] text-white font-medium shadow-xs"
                    >
                      {audioRecorded ? 'Regravar' : 'Gravar 15s'}
                    </button>
                  </div>
                </div>
              )}

              {/* Thought Color Palette */}
              {newType === 'thought' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5" />
                    <span>Cor do Cartão de Fundo</span>
                  </label>
                  <div className="flex items-center gap-2">
                    {[
                      { hex: '#2563EB', name: 'Azul' },
                      { hex: '#7C3AED', name: 'Roxo' },
                      { hex: '#059669', name: 'Esmeralda' },
                      { hex: '#D97706', name: 'Âmbar' },
                      { hex: '#E11D48', name: 'Rosa' },
                      { hex: '#475569', name: 'Ardósia' }
                    ].map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setNewAccentColor(c.hex)}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          newAccentColor === c.hex ? 'scale-110 border-neutral-900 dark:border-white ring-2 ring-[var(--senda-accent)]/30' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.name}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Location Input */}
              <div className="space-y-1.5">
                <Input
                  label="Localização Opcional"
                  placeholder="Ex: Lisboa, Estúdio Criativo, Em trânsito"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                />
                <div className="flex items-center gap-1.5">
                  {['Lisboa', 'Porto', 'Home Office', 'Em viagem'].map((loc) => (
                    <button
                      key={loc}
                      type="button"
                      onClick={() => setNewLocation(loc)}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                    >
                      {loc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Expiration selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Tempo de Expiração
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { h: 6, label: '6 horas' },
                    { h: 24, label: '24 horas' },
                    { h: 72, label: '3 dias' },
                    { h: 168, label: '7 dias' }
                  ].map((exp) => (
                    <button
                      key={exp.h}
                      type="button"
                      onClick={() => setNewExpirationHours(exp.h)}
                      className={`p-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                        newExpirationHours === exp.h
                          ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {exp.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy selection */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                  Quem pode visualizar?
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { p: 'contacts' as const, label: 'Contatos' },
                    { p: 'all' as const, label: 'Todos' },
                    { p: 'only_me' as const, label: 'Apenas Eu' }
                  ].map((opt) => (
                    <button
                      key={opt.p}
                      type="button"
                      onClick={() => setNewPrivacy(opt.p)}
                      className={`p-2 rounded-lg border text-center text-xs transition-all cursor-pointer ${
                        newPrivacy === opt.p
                          ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] font-semibold'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  onClick={() => setIsCreating(false)}
                  className="w-1/2"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  className="w-1/2"
                >
                  Publicar Momento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Camera Capture Modal for Direct Photos from Device */}
      <DeviceCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Fotografar Momento"
      />
    </div>
  );
};
