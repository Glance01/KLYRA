import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PresenceStatus } from '../../types';
import { Avatar, PRESENCE_CONFIG } from '../../components/ds/Avatar';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { 
  X, 
  QrCode, 
  Copy, 
  Check, 
  ShieldCheck, 
  Edit3, 
  Save, 
  Eye, 
  Radio,
  Share2
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESENCE_MESSAGE_PRESETS = [
  'Disponível para conversar',
  'No trabalho / Reunião',
  'Estudando focado',
  'Em viagem',
  'Responderei mais tarde',
  'Apenas mensagens urgentes'
];

export const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose }) => {
  const { currentUser, updateProfile, updatePresence, updatePresenceVisibility, deviceKeys } = useAuth();

  const [activeTab, setActiveTab] = useState<'profile' | 'presence' | 'qrcode'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedFingerprint, setCopiedFingerprint] = useState(false);

  // Edit fields
  const [displayName, setDisplayName] = useState(currentUser?.displayName || '');
  const [bio, setBio] = useState(currentUser?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatarUrl || '');
  const [customStatusInput, setCustomStatusInput] = useState(currentUser?.presence?.customMessage || '');

  if (!isOpen || !currentUser) return null;

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      displayName: displayName.trim() || currentUser.displayName,
      bio: bio.trim(),
      avatarUrl: avatarUrl.trim() || undefined
    });
    setIsEditing(false);
  };

  const handlePresenceChange = (status: PresenceStatus) => {
    updatePresence(status, customStatusInput);
  };

  const handleSaveCustomStatus = () => {
    updatePresence(currentUser.presence?.status || 'available', customStatusInput);
  };

  const profileUrl = `senda.app/@${currentUser.username}`;

  const copyToClipboard = (text: string, setFn: (v: boolean) => void) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFn(true);
      setTimeout(() => setFn(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              Identidade & Presença
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-neutral-100 dark:border-neutral-800 px-5 pt-2 gap-4 text-xs font-medium">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 transition-colors border-b-2 ${
              activeTab === 'profile'
                ? 'border-[var(--senda-accent)] text-[var(--senda-accent)]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            Meu Perfil
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('presence')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1.5 ${
              activeTab === 'presence'
                ? 'border-[var(--senda-accent)] text-[var(--senda-accent)]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${PRESENCE_CONFIG[currentUser.presence?.status || 'available'].bg}`} />
            Presença
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('qrcode')}
            className={`pb-2.5 transition-colors border-b-2 flex items-center gap-1 ${
              activeTab === 'qrcode'
                ? 'border-[var(--senda-accent)] text-[var(--senda-accent)]'
                : 'border-transparent text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200'
            }`}
          >
            <QrCode className="w-3.5 h-3.5" />
            QR Code & Link
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {activeTab === 'profile' && (
            <div className="space-y-5">
              {!isEditing ? (
                /* View Mode */
                <div className="flex flex-col items-center text-center">
                  <Avatar
                    name={currentUser.displayName}
                    src={currentUser.avatarUrl}
                    size="xl"
                    presence={currentUser.presence?.status || 'available'}
                    className="mb-3"
                  />
                  
                  <h3 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                    {currentUser.displayName}
                  </h3>
                  
                  <p className="text-sm font-mono text-[var(--senda-accent)] mt-0.5">
                    @{currentUser.username}
                  </p>

                  <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-sm mt-3 leading-relaxed">
                    {currentUser.bio || 'Sem biografia informada.'}
                  </p>

                  {/* Device fingerprint card */}
                  <div className="mt-5 w-full p-3.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800 text-left">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-semibold text-neutral-500 flex items-center gap-1.5 uppercase tracking-wider">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        Identidade Criptográfica do Dispositivo
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(deviceKeys?.fingerprint || '', setCopiedFingerprint)}
                        className="text-[11px] text-[var(--senda-accent)] hover:underline flex items-center gap-1"
                      >
                        {copiedFingerprint ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                        {copiedFingerprint ? 'Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-neutral-600 dark:text-neutral-400 break-all leading-normal">
                      {deviceKeys?.fingerprint || 'ECDH P-256 Key Material Ativo'}
                    </p>
                  </div>

                  <div className="w-full pt-4">
                    <Button
                      variant="secondary"
                      size="md"
                      onClick={() => setIsEditing(true)}
                      leftIcon={<Edit3 className="w-4 h-4" />}
                      className="w-full"
                    >
                      Editar Dados do Perfil
                    </Button>
                  </div>
                </div>
              ) : (
                /* Edit Mode */
                <form onSubmit={handleSaveProfile} className="space-y-4">
                  <Input
                    label="Nome de Exibição"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                  />

                  <Input
                    label="URL da Imagem de Avatar"
                    placeholder="https://..."
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                  />

                  <div className="flex flex-col gap-1.5 text-left">
                    <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                      Biografia / Recado
                    </label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Breve frase que define você..."
                      className="w-full bg-neutral-100/80 dark:bg-neutral-900/90 rounded-xl border border-neutral-300/80 dark:border-neutral-800 p-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-[var(--senda-accent)]"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="md"
                      onClick={() => setIsEditing(false)}
                      className="w-1/2"
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      size="md"
                      leftIcon={<Save className="w-4 h-4" />}
                      className="w-1/2"
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </form>
              )}
            </div>
          )}

          {activeTab === 'presence' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
                  Selecione seu Estado de Presença
                </h3>

                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(PRESENCE_CONFIG) as PresenceStatus[]).map((st) => {
                    const cfg = PRESENCE_CONFIG[st];
                    const isSelected = (currentUser.presence?.status || 'available') === st;

                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handlePresenceChange(st)}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)]'
                            : 'border-neutral-200/80 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900/40'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-3 h-3 rounded-full ${cfg.bg}`} />
                          <div className="text-left">
                            <p className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                              {cfg.label}
                            </p>
                            <p className="text-[10px] text-neutral-500">
                              {st === 'available' && 'Visível para novas conexões'}
                              {st === 'busy' && 'Notificações silenciadas mas entregues'}
                              {st === 'dnd' && 'Não perturbar ativado'}
                              {st === 'away' && 'Ausente temporariamente'}
                              {st === 'invisible' && 'Aparece como desconectado para todos'}
                            </p>
                          </div>
                        </div>

                        {isSelected && <Check className="w-4 h-4 text-[var(--senda-accent)]" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Status Message */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">
                  Mensagem Personalizada de Status
                </h3>
                
                <div className="flex gap-2 mb-3">
                  <Input
                    placeholder="Ex: No trabalho, responderei à noite..."
                    value={customStatusInput}
                    onChange={(e) => setCustomStatusInput(e.target.value)}
                  />
                  <Button size="md" onClick={handleSaveCustomStatus}>
                    Atualizar
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PRESENCE_MESSAGE_PRESETS.map((msg, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        setCustomStatusInput(msg);
                        updatePresence(currentUser.presence?.status || 'available', msg);
                      }}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy control for presence */}
              <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-neutral-400" />
                  Quem Pode Ver Minha Presença?
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {(['everyone', 'contacts', 'nobody'] as const).map((vis) => (
                    <button
                      key={vis}
                      type="button"
                      onClick={() => updatePresenceVisibility(vis)}
                      className={`p-2 rounded-xl border text-center text-xs font-medium transition-all ${
                        currentUser.presence.visibility === vis
                          ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400'
                      }`}
                    >
                      {vis === 'everyone' && 'Todos'}
                      {vis === 'contacts' && 'Contatos'}
                      {vis === 'nobody' && 'Ninguém'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'qrcode' && (
            <div className="flex flex-col items-center text-center space-y-4 py-2">
              <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-xs">
                Apresente este código para que outras pessoas adicionem você sem intermediários ou rastreamento.
              </p>

              {/* Visual QR Code Display */}
              <div className="p-5 bg-white rounded-2xl shadow-sm border border-neutral-200 flex flex-col items-center">
                {/* SVG QR Code Simulation */}
                <svg width="180" height="180" viewBox="0 0 100 100" fill="none" className="text-neutral-900">
                  {/* Outer Frame */}
                  <rect width="100" height="100" fill="white" />
                  {/* Finder pattern Top-Left */}
                  <rect x="10" y="10" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                  <rect x="16" y="16" width="12" height="12" fill="currentColor" />
                  {/* Finder pattern Top-Right */}
                  <rect x="66" y="10" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                  <rect x="72" y="16" width="12" height="12" fill="currentColor" />
                  {/* Finder pattern Bottom-Left */}
                  <rect x="10" y="66" width="24" height="24" stroke="currentColor" strokeWidth="4" />
                  <rect x="16" y="72" width="12" height="12" fill="currentColor" />
                  {/* Stylized SENDA Center Icon */}
                  <circle cx="50" cy="50" r="11" fill="white" />
                  <circle cx="50" cy="50" r="8" fill="var(--senda-accent, #3B82F6)" />
                  {/* Synthetic data dots */}
                  <rect x="42" y="14" width="4" height="4" fill="currentColor" />
                  <rect x="54" y="14" width="4" height="4" fill="currentColor" />
                  <rect x="42" y="24" width="4" height="4" fill="currentColor" />
                  <rect x="48" y="32" width="4" height="4" fill="currentColor" />
                  <rect x="36" y="44" width="4" height="4" fill="currentColor" />
                  <rect x="60" y="44" width="4" height="4" fill="currentColor" />
                  <rect x="44" y="66" width="4" height="4" fill="currentColor" />
                  <rect x="54" y="72" width="4" height="4" fill="currentColor" />
                  <rect x="64" y="80" width="4" height="4" fill="currentColor" />
                  <rect x="78" y="66" width="4" height="4" fill="currentColor" />
                </svg>

                <div className="mt-2 text-center">
                  <span className="font-bold text-xs tracking-wider text-neutral-800">@{currentUser.username}</span>
                </div>
              </div>

              {/* Profile Link Box */}
              <div className="w-full flex items-center justify-between p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 text-left">
                <span className="text-xs font-mono text-neutral-700 dark:text-neutral-300 truncate mr-2">
                  {profileUrl}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(profileUrl, setCopiedLink)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--senda-accent)] text-white text-xs font-medium flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copiedLink ? 'Copiado' : 'Copiar'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
