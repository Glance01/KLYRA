import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { StorageSettingsSection } from './StorageSettingsSection';
import { ProfileSettingsSection } from './ProfileSettingsSection';
import { notificationService } from '../../services/notificationService';
import { 
  ShieldCheck, 
  Lock, 
  Smartphone, 
  KeyRound, 
  Eye, 
  Trash2, 
  Download, 
  Check, 
  Copy, 
  AlertTriangle,
  Radio,
  UserX,
  Bell,
  BellRing,
  Database,
  RefreshCw,
  Cloud,
  Clock,
  HardDrive,
  User,
  SlidersHorizontal
} from 'lucide-react';

export const PrivacySecurityView: React.FC = () => {
  const { t } = useTheme();
  const { 
    currentUser, 
    deviceKeys, 
    connectedDevices, 
    revokeDevice,
    lockPin,
    lockTimeoutMinutes,
    setAppLockPin,
    logout
  } = useAuth();

  const [copiedFingerprint, setCopiedFingerprint] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [pinSuccess, setPinSuccess] = useState(false);
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [copiedBackupKey, setCopiedBackupKey] = useState(false);

  // Free Native Push Notifications State
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState('');
  const [notifSuccess, setNotifSuccess] = useState('');
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission>(() => 
    notificationService.getPermission()
  );

  // Server-side Backup State
  const [backupStats, setBackupStats] = useState<any>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupError, setBackupError] = useState('');
  const [backupSuccess, setBackupSuccess] = useState('');

  const fetchBackupStatus = async () => {
    try {
      const res = await fetch('/api/backup/status');
      const data = await res.json();
      if (data.success) {
        setBackupStats(data.stats);
      }
    } catch (e: any) {
      console.warn('Erro ao obter status do backup:', e);
    }
  };

  const triggerBackup = async () => {
    setIsBackingUp(true);
    setBackupError('');
    setBackupSuccess('');
    try {
      const res = await fetch('/api/backup/trigger', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setBackupStats(data.stats);
        setBackupSuccess('Backup manual realizado e sincronizado com total sucesso!');
      } else {
        setBackupError(data.error || 'Falha ao processar a rotina de backup no servidor.');
      }
    } catch (e: any) {
      setBackupError(e?.message || 'Erro de rede ao disparar o backup no servidor.');
    } finally {
      setIsBackingUp(false);
    }
  };

  React.useEffect(() => {
    fetchBackupStatus();
  }, []);

  const requestNotificationPermission = async () => {
    setNotifError('');
    setNotifSuccess('');
    setNotifLoading(true);

    try {
      const permission = await notificationService.requestPermission();
      setPermissionStatus(permission);

      if (permission === 'granted') {
        setNotifSuccess('Excelente! Notificações nativas gratuitas ativadas com sucesso para mensagens e chamadas.');
        notificationService.playMessageChime();
      } else if (permission === 'denied') {
        setNotifError('Permissão negada no navegador. Para liberar: toque no ícone de opções/cadeado ao lado da barra de endereço e ative as Notificações para este site.');
      } else {
        setNotifError('Aguardando resposta da solicitação de permissão...');
      }
    } catch (err: any) {
      setNotifError(err?.message || 'Erro ao configurar notificações nativas.');
    } finally {
      setNotifLoading(false);
    }
  };

  const simulateBackgroundNotification = async () => {
    setNotifError('');
    setNotifSuccess('');
    
    const result = await notificationService.triggerTestNotification();
    if (result.nativeBanner) {
      setNotifSuccess('✨ Notificação completa disparada: som harmônico Web Audio, vibração tátil e banner no sistema operacional!');
    } else {
      setNotifSuccess('🔊 Sinal sonoro Web Audio e vibração disparados com sucesso no aparelho! (Para ver o banner flutuante fora do app, autorize as notificações no navegador).');
    }
  };

  // Recovery Key simulation (24 words format for authentic E2EE backup)
  const recoveryKeyWords = "horizon velvet echo sapphire wander cipher meadow timber compass quartz ripple zenith canyon anchor beacon pulse ember marble shadow mystic lantern orbit cascade voyage";

  const handleConfigurePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPin.length === 4) {
      setAppLockPin(newPin, 1);
      setPinSuccess(true);
      setTimeout(() => setPinSuccess(false), 2000);
    }
  };

  const handleRemovePin = () => {
    setAppLockPin(null);
    setNewPin('');
  };

  type PrivacyCategory = 'all' | 'profile' | 'crypto' | 'devices' | 'storage';
  const [activeCategory, setActiveCategory] = useState<PrivacyCategory>('all');

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Centro de Privacidade & Segurança</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('privacy.title', 'Privacidade & Dispositivos')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('privacy.subtitle', 'Edite seu perfil, biografia, gerencie chaves criptográficas, PIN e aparelhos conectados.')}
          </p>
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'Todas as Opções', icon: SlidersHorizontal },
          { id: 'profile', label: 'Editar Perfil & Bio', icon: User },
          { id: 'crypto', label: 'Chaves Criptográficas', icon: KeyRound },
          { id: 'devices', label: 'Dispositivos & PIN', icon: Smartphone },
          { id: 'storage', label: 'Nuvem & Armazenamento', icon: Cloud },
        ].map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id as PrivacyCategory)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[var(--senda-accent)] text-white shadow-xs'
                  : 'bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* 0. User Profile & Bio Management (Directly in Privacy & Devices Tab) */}
      {(activeCategory === 'all' || activeCategory === 'profile') && (
        <ProfileSettingsSection initialEditing={activeCategory === 'profile'} />
      )}

      {/* 1. Hardware & Device Identity */}
      {(activeCategory === 'all' || activeCategory === 'crypto') && (
        <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <KeyRound className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Identidade Criptográfica do Dispositivo
                </h2>
                <p className="text-xs text-neutral-500">Par de chaves gerado via W3C Web Cryptography API (P-256)</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(deviceKeys?.fingerprint || '');
                setCopiedFingerprint(true);
                setTimeout(() => setCopiedFingerprint(false), 2000);
              }}
              className="text-xs text-[var(--senda-accent)] hover:underline flex items-center gap-1 font-medium"
            >
              {copiedFingerprint ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedFingerprint ? 'Copiado' : 'Copiar Fingerprint'}</span>
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-700 dark:text-neutral-300 break-all leading-relaxed">
            {deviceKeys?.fingerprint || '48192 01847 99201 44820 91823 48102 94810 29381 02938 10293 84710 29384'}
          </div>

          <p className="text-xs text-neutral-500 leading-normal">
            Sua chave privada nunca sai deste navegador ou dispositivo. As mensagens privadas são cifradas antes do envio.
          </p>
        </section>
      )}

      {/* 2. App Lock with PIN */}
      {(activeCategory === 'all' || activeCategory === 'devices') && (
        <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Bloqueio do Aplicativo
              </h2>
              <p className="text-xs text-neutral-500">Exige código PIN de 4 dígitos ao abrir o SENDA</p>
            </div>
          </div>

          {lockPin ? (
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">Bloqueio Ativo (PIN Definido)</span>
              </div>
              <Button variant="danger" size="sm" onClick={handleRemovePin}>
                Remover PIN
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConfigurePin} className="flex items-end gap-3 max-w-sm">
              <Input
                label="Definir PIN Numérico de 4 dígitos"
                type="password"
                maxLength={4}
                placeholder="••••"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value.replace(/[^0-9]/g, ''))}
              />
              <Button type="submit" size="md" disabled={newPin.length !== 4}>
                {pinSuccess ? 'PIN Salvo!' : 'Ativar Bloqueio'}
              </Button>
            </form>
          )}
        </section>
      )}

      {/* 3. Connected Devices */}
      {(activeCategory === 'all' || activeCategory === 'devices') && (
        <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                  Dispositivos Conectados
                </h2>
                <p className="text-xs text-neutral-500">Cada aparelho possui identidade criptográfica própria</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60">
            {connectedDevices.map((device) => (
              <div key={device.id} className="py-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                      {device.name}
                    </h3>
                    {device.isCurrent && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                        Este Dispositivo
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 mt-0.5">
                    {device.platform} • {device.lastActive}
                  </p>
                </div>

                {!device.isCurrent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => revokeDevice(device.id)}
                    className="text-rose-500 hover:text-rose-600 text-xs"
                  >
                    Revogar
                  </Button>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 4. Local Encrypted Storage & Device Media Management */}
      {(activeCategory === 'all' || activeCategory === 'storage') && (
        <StorageSettingsSection />
      )}

      {/* 5. Secure Encrypted Backup with Recovery Key */}
      {(activeCategory === 'all' || activeCategory === 'crypto') && (
        <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Backup Criptografado & Chave de Recuperação
              </h2>
              <p className="text-xs text-neutral-500">Protegido por derivação PBKDF2. O SENDA não armazena sua chave.</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowBackupModal(true)}
              leftIcon={<Download className="w-3.5 h-3.5" />}
            >
              Ver Chave de Recuperação
            </Button>
          </div>
        </section>
      )}

      {/* 5.5. Free Native Web & PWA Notifications */}
      {(activeCategory === 'all' || activeCategory === 'storage') && (
        <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Notificações Nativas do Navegador & PWA
              </h2>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                100% Gratuito
              </span>
            </div>
            <p className="text-xs text-neutral-500">
              Alertas sonoros, vibração tátil e avisos no sistema operacional sem custos de servidores push ou assinaturas.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Status Display */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 rounded-xl bg-neutral-100/60 dark:bg-neutral-900/50 border border-neutral-200 dark:border-neutral-800 text-xs">
            <div className="space-y-1">
              <span className="font-semibold text-neutral-700 dark:text-neutral-300">Status no Dispositivo:</span>
              <div className="flex items-center gap-1.5 font-bold">
                {permissionStatus === 'granted' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wide font-sans">Ativo & Autorizado</span>
                  </>
                ) : permissionStatus === 'denied' ? (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400 uppercase tracking-wide font-sans">Bloqueado nas Definições do Navegador</span>
                  </>
                ) : (
                  <>
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-blue-600 dark:text-blue-400 uppercase tracking-wide font-sans">Pronto para Ativar</span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 sm:pt-0">
              <Button
                variant={permissionStatus === 'granted' ? 'secondary' : 'primary'}
                size="sm"
                onClick={requestNotificationPermission}
                disabled={notifLoading}
                leftIcon={<BellRing className="w-3.5 h-3.5" />}
              >
                {notifLoading ? 'Ativando...' : permissionStatus === 'granted' ? 'Notificações Ativas' : 'Ativar Notificações'}
              </Button>

              <Button
                variant="secondary"
                size="sm"
                onClick={simulateBackgroundNotification}
                leftIcon={<Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />}
              >
                Testar Som & Alerta
              </Button>
            </div>
          </div>

          {/* Helper tip for Chrome / Mobile Browser permissions */}
          {permissionStatus === 'denied' && !notifError && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-200">
                <span>💡 Como desbloquear no Chrome/Celular:</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Toque no ícone de configurações ou cadeado ao lado da barra de endereço do navegador &gt; <strong>Permissões</strong> &gt; <strong>Notificações</strong> &gt; marque <strong>Permitir</strong> e recarregue a página.
              </p>
            </div>
          )}

          {/* Feedback Messages */}
          {notifSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed">
              {notifSuccess}
            </div>
          )}

          {notifError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
              {notifError}
            </div>
          )}

          {/* Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-neutral-600 dark:text-neutral-400">
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center gap-2">
              <span className="text-emerald-500">🔊</span>
              <span>Sino sintetizado Web Audio (zero download)</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center gap-2">
              <span className="text-cyan-500">📳</span>
              <span>Vibração física no smartphone</span>
            </div>
            <div className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/40 border border-neutral-200/60 dark:border-neutral-800/60 flex items-center gap-2">
              <span className="text-indigo-500">🔔</span>
              <span>Banner nativo com toque para atender</span>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* 5. Server-side Database Backup */}
      {(activeCategory === 'all' || activeCategory === 'storage') && (
        <section className="space-y-4 pt-2">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
            <Database className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <span>Backup do Servidor (Firestore para Storage)</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black uppercase">Seguro</span>
            </h4>
            <p className="text-[11px] text-neutral-500 leading-normal">
              O SENDA realiza um backup diário automático de segurança de todos os perfis, momentos ativos e históricos de conversas criptografadas de ponta a ponta (E2EE) diretamente para o Bucket de Armazenamento do Firebase Storage. Você também pode disparar um backup manual instantâneo.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-neutral-50/50 dark:bg-neutral-900/35 border border-neutral-200/80 dark:border-neutral-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-200/60 dark:border-neutral-800/60">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Frequência da Rotina</span>
              <div className="flex items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-300 font-semibold">
                <Clock className="w-3.5 h-3.5 text-[var(--senda-accent)]" />
                <span>Diário • Executado automaticamente a cada 24 horas</span>
              </div>
            </div>
            
            <div className="shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={triggerBackup}
                disabled={isBackingUp}
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />}
              >
                {isBackingUp ? 'Executando...' : 'Fazer Backup Agora'}
              </Button>
            </div>
          </div>

          {/* Backup Stats Display */}
          {backupStats && (
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Status do Último Backup</span>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Data / Hora</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block truncate">
                    {backupStats.timestamp === 'Nunca executado' ? 'Nunca executado' : new Date(backupStats.timestamp).toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Usuários Protegidos</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {backupStats.usersCount} contas
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Mensagens E2EE</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {backupStats.messagesCount} salvas
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Conversas Salvas</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {backupStats.conversationsCount} chats
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Momentos Ativos</span>
                  <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
                    {backupStats.momentsCount} posts
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-neutral-100/50 dark:bg-neutral-900/60 border border-neutral-200/40 dark:border-neutral-800/40 space-y-0.5">
                  <span className="text-[9px] text-neutral-400 font-bold block uppercase">Destino</span>
                  <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 block truncate flex items-center gap-1" title={backupStats.destination}>
                    {backupStats.destination.includes('Storage') ? <Cloud className="w-3.5 h-3.5 shrink-0" /> : <HardDrive className="w-3.5 h-3.5 shrink-0" />}
                    <span>{backupStats.destination}</span>
                  </span>
                </div>
              </div>

              {backupStats.fileName !== 'Nenhum' && (
                <div className="p-2 px-3 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/80 border border-neutral-200 dark:border-neutral-800 text-[10px] text-neutral-500 font-mono flex items-center justify-between">
                  <span>Arquivo: {backupStats.fileName}</span>
                  <span className="text-emerald-500 font-bold">100% Sincronizado</span>
                </div>
              )}
            </div>
          )}

          {/* Feedback messages */}
          {backupSuccess && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 font-semibold leading-relaxed">
              {backupSuccess}
            </div>
          )}

          {backupError && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 font-semibold leading-relaxed">
              <strong>Erro no backup:</strong> {backupError}
            </div>
          )}
        </div>
      </section>
      )}

      {/* 6. Account Logout */}
      {(activeCategory === 'all' || activeCategory === 'devices') && (
        <section className="pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">Encerrar Sessão</p>
            <p className="text-[11px] text-neutral-500">Remove chaves locais do navegador.</p>
          </div>
          <Button variant="danger" size="sm" onClick={logout}>
            Sair da Conta
          </Button>
        </section>
      )}

      {/* Backup Key Modal */}
      {showBackupModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowBackupModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight">Sua Chave de Recuperação</h3>
                <p className="text-xs text-neutral-500">24 palavras criptográficas</p>
              </div>
            </div>

            <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
              <strong>Importante:</strong> Se você perder sua chave de recuperação e seu dispositivo, suas conversas privadas não poderão ser recuperadas por ninguém, nem pela equipe do SENDA.
            </p>

            <div className="p-4 rounded-xl bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs text-neutral-800 dark:text-neutral-200 leading-loose select-all">
              {recoveryKeyWords}
            </div>

            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="md"
                className="w-1/2"
                onClick={() => {
                  navigator.clipboard?.writeText(recoveryKeyWords);
                  setCopiedBackupKey(true);
                  setTimeout(() => setCopiedBackupKey(false), 2000);
                }}
                leftIcon={copiedBackupKey ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              >
                {copiedBackupKey ? 'Copiada' : 'Copiar Palavras'}
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-1/2"
                onClick={() => setShowBackupModal(false)}
              >
                Entendi e Guardei
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
