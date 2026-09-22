import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PresenceStatus, UserPresence } from '../../types';
import { Avatar, PRESENCE_CONFIG } from '../../components/ds/Avatar';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { DeviceCameraCaptureModal } from '../../components/media/DeviceCameraCaptureModal';
import { 
  User, 
  Edit3, 
  Camera, 
  Upload, 
  Link as LinkIcon, 
  Trash2, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Cloud, 
  ShieldCheck, 
  Eye, 
  Smile, 
  Save, 
  X, 
  Radio, 
  Lock, 
  RefreshCw,
  AtSign,
  Quote
} from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
];

const BIO_SUGGESTIONS = [
  'Disponível para conversar',
  'Foco total em privacidade e segurança',
  'Apenas recados importantes',
  'Viajando e desconectado',
  'SENDA: Criptografia de ponta a ponta',
  'Vivendo o presente'
];

export interface ProfileSettingsSectionProps {
  initialEditing?: boolean;
}

export const ProfileSettingsSection: React.FC<ProfileSettingsSectionProps> = ({ initialEditing = false }) => {
  const { currentUser, updateProfile, updatePresence, updatePresenceVisibility } = useAuth();

  const [isEditing, setIsEditing] = useState(initialEditing);

  useEffect(() => {
    if (initialEditing) {
      setIsEditing(true);
    }
  }, [initialEditing]);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Form Fields
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [presenceStatus, setPresenceStatus] = useState<PresenceStatus>('available');
  const [customStatusMessage, setCustomStatusMessage] = useState('');
  const [visibility, setVisibility] = useState<UserPresence['visibility']>('everyone');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state when currentUser is loaded or changes
  useEffect(() => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setPresenceStatus(currentUser.presence?.status || 'available');
      setCustomStatusMessage(currentUser.presence?.customMessage || '');
      setVisibility(currentUser.presence?.visibility || 'everyone');
    }
  }, [currentUser]);

  if (!currentUser) return null;

  // Handle uploading device photo to media link
  const handleDeviceImageUpload = async (file: File) => {
    setErrorMsg('');
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        try {
          const res = await fetch('/api/media/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: 'image', data: base64 })
          });
          const json = await res.json();
          if (json.success && json.url) {
            setAvatarUrl(json.url);
          } else {
            setAvatarUrl(base64);
          }
        } catch {
          setAvatarUrl(base64);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setErrorMsg('Não foi possível carregar a imagem do dispositivo.');
    }
  };

  // Handle camera photo
  const handleCameraCapture = async (mediaDataUrl: string) => {
    setIsCameraOpen(false);
    setErrorMsg('');
    try {
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'image', data: mediaDataUrl })
      });
      const json = await res.json();
      if (json.success && json.url) {
        setAvatarUrl(json.url);
      } else {
        setAvatarUrl(mediaDataUrl);
      }
    } catch {
      setAvatarUrl(mediaDataUrl);
    }
  };

  const handleApplyCustomUrl = () => {
    if (customUrlInput.trim()) {
      setAvatarUrl(customUrlInput.trim());
      setShowUrlInput(false);
      setCustomUrlInput('');
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!displayName.trim()) {
      setErrorMsg('O nome de exibição não pode estar vazio.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');

    try {
      const cleanUsername = username.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9_]/g, '') || currentUser.username;
      
      const updatedPresence: UserPresence = {
        status: presenceStatus,
        customMessage: customStatusMessage.trim(),
        visibility: visibility,
        updatedAt: new Date().toISOString()
      };

      updateProfile({
        displayName: displayName.trim(),
        username: cleanUsername,
        bio: bio.trim(),
        avatarUrl: avatarUrl.trim() || undefined,
        presence: updatedPresence
      });

      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsEditing(false);
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao sincronizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    if (currentUser) {
      setDisplayName(currentUser.displayName || '');
      setUsername(currentUser.username || '');
      setBio(currentUser.bio || '');
      setAvatarUrl(currentUser.avatarUrl || '');
      setPresenceStatus(currentUser.presence?.status || 'available');
      setCustomStatusMessage(currentUser.presence?.customMessage || '');
      setVisibility(currentUser.presence?.visibility || 'everyone');
    }
    setIsEditing(false);
    setErrorMsg('');
    setShowUrlInput(false);
  };

  return (
    <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-5 shadow-xs overflow-hidden">
      {/* Header with Title and Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Perfil & Identidade do Usuário
              </h2>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Cloud className="w-3 h-3" />
                Firestore
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Personalize sua foto, nome de exibição, biografia e status público no SENDA
            </p>
          </div>
        </div>

        {!isEditing && (
          <Button
            id="edit-profile-bio-btn"
            variant="primary"
            size="sm"
            onClick={() => setIsEditing(true)}
            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
          >
            Editar Perfil & Biografia
          </Button>
        )}
      </div>

      {/* Hidden File Input for Device Image Selection */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleDeviceImageUpload(file);
          e.target.value = '';
        }}
      />

      {/* Camera Capture Modal */}
      <DeviceCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        title="Tirar Foto para o Perfil"
      />

      {/* VIEW MODE: Clean, compact summary card */}
      {!isEditing ? (
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4 p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/50 border border-neutral-200/70 dark:border-neutral-800/70">
          <div className="relative shrink-0">
            <Avatar
              name={currentUser.displayName}
              src={currentUser.avatarUrl}
              size="lg"
              presence={currentUser.presence?.status || 'available'}
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1.5 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
              <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100 truncate">
                {currentUser.displayName}
              </h3>
              <span className="text-xs font-mono font-medium text-[var(--senda-accent)] px-2 py-0.5 rounded-md bg-[var(--senda-accent-subtle)] w-fit mx-auto sm:mx-0">
                @{currentUser.username}
              </span>
            </div>

            {currentUser.bio ? (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 italic flex items-center gap-1.5 justify-center sm:justify-start">
                <Quote className="w-3 h-3 text-neutral-400 shrink-0 inline" />
                <span>{currentUser.bio}</span>
              </p>
            ) : (
              <p className="text-xs text-neutral-400 italic">
                Nenhuma biografia informada ainda. Clique em Editar Perfil para adicionar.
              </p>
            )}

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-[11px] text-neutral-500">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-200/70 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-medium">
                <span className={`w-2 h-2 rounded-full ${PRESENCE_CONFIG[currentUser.presence?.status || 'available'].bg}`} />
                {PRESENCE_CONFIG[currentUser.presence?.status || 'available'].label}
              </span>

              {currentUser.presence?.customMessage && (
                <span className="px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800/80 text-neutral-600 dark:text-neutral-400">
                  "{currentUser.presence.customMessage}"
                </span>
              )}

              <span className="text-[10px] text-neutral-400">
                Visibilidade: {currentUser.presence?.visibility === 'everyone' ? 'Pública' : currentUser.presence?.visibility === 'contacts' ? 'Contatos' : 'Oculta'}
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* EDIT MODE: Form to update avatar, displayName, username, bio, presence, and privacy */
        <form onSubmit={handleSave} className="space-y-5 animate-in fade-in duration-200">
          {/* Avatar Editing Zone */}
          <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
              1. Foto de Perfil & Avatar
            </label>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-18 h-18 rounded-full overflow-hidden border-2 border-[var(--senda-accent)] shadow-sm bg-neutral-200 dark:bg-neutral-800 relative">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt="Avatar Atual" 
                      className="w-full h-full object-cover" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-bold text-xl text-neutral-400">
                      {displayName ? displayName.charAt(0).toUpperCase() : 'S'}
                    </div>
                  )}
                </div>

                <span 
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-white dark:border-[#121518] ${PRESENCE_CONFIG[presenceStatus].bg}`} 
                  title={`Status: ${PRESENCE_CONFIG[presenceStatus].label}`}
                />
              </div>

              {/* Action buttons */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setIsCameraOpen(true)}
                    leftIcon={<Camera className="w-3.5 h-3.5 text-[var(--senda-accent)]" />}
                  >
                    Tirar Foto
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    leftIcon={<Upload className="w-3.5 h-3.5" />}
                  >
                    Arquivo do Aparelho
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowUrlInput(!showUrlInput)}
                    leftIcon={<LinkIcon className="w-3.5 h-3.5" />}
                  >
                    Link Web (URL)
                  </Button>

                  {avatarUrl && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setAvatarUrl('')}
                      className="text-rose-500 hover:text-rose-600"
                      leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    >
                      Remover
                    </Button>
                  )}
                </div>

                {/* Optional Web URL Input */}
                {showUrlInput && (
                  <div className="flex items-center gap-2 pt-1 max-w-md">
                    <Input
                      placeholder="https://exemplo.com/minha-foto.jpg"
                      value={customUrlInput}
                      onChange={(e) => setCustomUrlInput(e.target.value)}
                      className="text-xs"
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleApplyCustomUrl}
                    >
                      Aplicar
                    </Button>
                  </div>
                )}

                {/* Preset Avatars Row */}
                <div className="flex items-center gap-2 pt-1 overflow-x-auto">
                  <span className="text-[11px] text-neutral-400 font-medium shrink-0">Ou padrão:</span>
                  <div className="flex items-center gap-1.5">
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all cursor-pointer ${
                          avatarUrl === preset 
                            ? 'border-[var(--senda-accent)] scale-110 shadow-xs' 
                            : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                        title="Escolher este avatar"
                      >
                        <img 
                          src={preset} 
                          alt="Preset avatar" 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Names Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Input
                label="Nome de Exibição"
                placeholder="Seu nome ou apelido público"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
              <p className="text-[11px] text-neutral-400 mt-1">Como você será visto nas conversas e chamadas.</p>
            </div>

            <div>
              <Input
                label="Nome de Usuário (@username)"
                placeholder="seu_usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                required
              />
              <p className="text-[11px] text-neutral-400 mt-1">Identificador exclusivo para encontrar seu contato.</p>
            </div>
          </div>

          {/* Biography & Quick Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                Biografia / Recado do Perfil
              </label>
              <span className="text-[10px] text-neutral-400">
                {bio.length} / 200 caracteres
              </span>
            </div>

            <textarea
              rows={3}
              maxLength={200}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Escreva uma frase, reflexão ou nota sobre você..."
              className="w-full bg-neutral-50 dark:bg-neutral-900 rounded-xl border border-neutral-300/80 dark:border-neutral-800 p-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-[var(--senda-accent)] transition-colors resize-none leading-relaxed"
            />

            {/* Quick Bio Suggestions */}
            <div className="space-y-1.5 pt-0.5">
              <span className="text-[11px] text-neutral-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[var(--senda-accent)]" />
                Sugestões rápidas de recado:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {BIO_SUGGESTIONS.map((sug, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setBio(sug)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800/80 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Presence Status Selector */}
          <div className="p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-3">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider block">
              2. Status de Presença Atual
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['available', 'busy', 'away', 'invisible'] as PresenceStatus[]).map((statusKey) => {
                const conf = PRESENCE_CONFIG[statusKey];
                const isSelected = presenceStatus === statusKey;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    onClick={() => setPresenceStatus(statusKey)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] shadow-xs'
                        : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300'
                    }`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${conf.bg} shrink-0`} />
                    <span className="truncate">{conf.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="pt-1">
              <Input
                label="Recado Personalizado de Status (Opcional)"
                placeholder="Ex: Em reunião até 15h, Volto logo..."
                value={customStatusMessage}
                onChange={(e) => setCustomStatusMessage(e.target.value)}
              />
            </div>
          </div>

          {/* Profile Privacy & Visibility */}
          <div className="p-4 rounded-xl bg-neutral-50/70 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800 space-y-2">
            <label className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[var(--senda-accent)]" />
              <span>3. Privacidade do Perfil & Presença</span>
            </label>

            <p className="text-xs text-neutral-500">
              Controle quem tem permissão para visualizar seu recado, foto e atividade recente.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              {[
                { id: 'everyone', label: 'Todos', desc: 'Qualquer usuário no SENDA' },
                { id: 'contacts', label: 'Meus Contatos', desc: 'Apenas quem tem conversas' },
                { id: 'nobody', label: 'Ninguém (Sigiloso)', desc: 'Totalmente reservado' },
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setVisibility(opt.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    visibility === opt.id
                      ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-neutral-900 dark:text-neutral-100'
                      : 'border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold">{opt.label}</span>
                    {visibility === opt.id && <CheckCircle2 className="w-3.5 h-3.5 text-[var(--senda-accent)]" />}
                  </div>
                  <span className="text-[10px] text-neutral-400 block">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Error & Feedback Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-medium">
              {errorMsg}
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>Perfil salvo e sincronizado com sucesso no Cloud Firestore!</span>
            </div>
          )}

          {/* Action Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
              leftIcon={isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSaving ? 'Salvando no Firestore...' : 'Salvar Alterações'}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
};
