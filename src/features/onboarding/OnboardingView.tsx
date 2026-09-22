import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SendaLogo } from '../../components/ds/SendaLogo';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { useAuth } from '../../context/AuthContext';
import { checkUsernameExists } from '../../services/firestoreSyncService';
import { DeviceCameraCaptureModal } from '../../components/media/DeviceCameraCaptureModal';
import { processDeviceImageFile } from '../../services/storageService';
import { Shield, Sparkles, ArrowRight, UserCheck, KeyRound, Camera, Upload, X, RefreshCw, Smartphone } from 'lucide-react';

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

export const OnboardingView: React.FC = () => {
  const { completeOnboarding, recoverAccount } = useAuth();
  const [step, setStep] = useState<'welcome' | 'profile' | 'keygen' | 'recover'>('welcome');

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [bio, setBio] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [nameError, setNameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recovery state
  const [recoverIdentifier, setRecoverIdentifier] = useState('');
  const [recoverPassword, setRecoverPassword] = useState('');
  const [recoverError, setRecoverError] = useState('');
  const [isRecovering, setIsRecovering] = useState(false);

  const [isCheckingUsername, setIsCheckingUsername] = useState(false);

  const handleUsernameBlur = async () => {
    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    if (cleanUser.length >= 3) {
      setIsCheckingUsername(true);
      try {
        const exists = await checkUsernameExists(cleanUser);
        if (exists) {
          setUsernameError(`A conta @${cleanUser} já existe no sistema. Não é permitido criar conta com username duplicado.`);
        }
      } catch (err) {
        console.warn('[Username check error]:', err);
      } finally {
        setIsCheckingUsername(false);
      }
    }
  };

  const handleDevicePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressedDataUrl = await processDeviceImageFile(file, 600, 600, 0.85);
      setAvatarUrl(compressedDataUrl);
    } catch (err) {
      console.warn('Erro ao processar imagem:', err);
    }
    e.target.value = '';
  };

  const handleStart = () => {
    setStep('profile');
  };

  const validateAndProceed = async (e: React.FormEvent) => {
    e.preventDefault();
    let valid = true;

    if (!displayName.trim()) {
      setNameError('Informe seu nome ou como prefere ser chamado.');
      valid = false;
    } else {
      setNameError('');
    }

    const cleanUser = username.replace(/^@/, '').trim().toLowerCase();
    const usernameRegex = /^[a-z0-9_]{3,30}$/;

    if (!cleanUser) {
      setUsernameError('Escolha seu @username único.');
      valid = false;
    } else if (!usernameRegex.test(cleanUser)) {
      setUsernameError('O username deve ter entre 3 e 30 caracteres (letras, números ou _).');
      valid = false;
    } else {
      setUsernameError('');
    }

    if (!password.trim() || password.length < 6) {
      setPasswordError('A senha deve ter pelo menos 6 caracteres.');
      valid = false;
    } else {
      setPasswordError('');
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('As senhas não coincidem.');
      valid = false;
    } else {
      setConfirmPasswordError('');
    }

    if (!valid) return;

    setIsSubmitting(true);
    setUsernameError('');
    try {
      const exists = await checkUsernameExists(cleanUser);
      if (exists) {
        setUsernameError(`A conta @${cleanUser} já existe no sistema. Não é permitido criar uma conta duplicada.`);
        setIsSubmitting(false);
        return;
      }
    } catch (e: any) {
      console.warn('[Conflict check error]:', e);
      if (e?.message === 'ACCOUNT_ALREADY_EXISTS') {
        setUsernameError(`A conta @${cleanUser} já está cadastrada. Não é permitido criar conta para um usuário existente.`);
        setIsSubmitting(false);
        return;
      }
    }

    setStep('keygen');

    try {
      await completeOnboarding(displayName, cleanUser, password, avatarUrl || undefined, bio);
    } catch (err: any) {
      console.error(err);
      setStep('profile');
      setIsSubmitting(false);
      if (err.message === 'ACCOUNT_ALREADY_EXISTS' || err.message === 'USERNAME_ALREADY_EXISTS') {
        setUsernameError(`A conta @${cleanUser} já está cadastrada no sistema. Não é permitido criar conta para um usuário existente.`);
      } else {
        setUsernameError('Erro ao criar conta. Tente novamente.');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 bg-[#FAF9F6] dark:bg-[#0B0D0F] text-neutral-900 dark:text-neutral-100 transition-colors duration-300">
      <div className="w-full max-w-md mx-auto relative">
        <AnimatePresence mode="wait">
          {step === 'welcome' && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="flex flex-col items-center text-center px-2 py-8"
            >
              {/* Senda Identity */}
              <div className="mb-8">
                <SendaLogo size={64} showText={false} />
              </div>

              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 font-sans">
                SENDA
              </h1>

              <p className="text-neutral-600 dark:text-neutral-400 text-base sm:text-lg mb-8 max-w-xs font-normal leading-relaxed">
                Conecte-se. Converse. Siga em frente.
              </p>

              {/* Pillars list */}
              <div className="w-full space-y-3 mb-10 text-left">
                <div className="p-3.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] shrink-0 mt-0.5">
                    <Shield className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">Privacidade Real por Padrão</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                      Criptografia ponta a ponta com chaves exclusivas do seu dispositivo. O servidor nunca lê suas mensagens.
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800/80 flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-tight">Simples por Fora. Poderoso por Dentro.</h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 leading-normal">
                      Design limpo sem ruído visual, sem bolhas gigantes e com controle absoluto sobre seu status de presença.
                    </p>
                  </div>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2.5">
                <Button
                  size="lg"
                  onClick={handleStart}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                  className="w-full shadow-md"
                >
                  COMEÇAR
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('recover');
                    setRecoverError('');
                  }}
                  className="text-xs text-[var(--senda-accent)] hover:underline font-medium py-1.5 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  Já tem uma conta? Recuperar neste celular
                </button>
              </div>

              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-6 text-center">
                Disponível na Web, Desktop e PWA Móvel.
              </p>
            </motion.div>
          )}

          {step === 'profile' && (
            <motion.div
              key="profile"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="bg-white/90 dark:bg-[#121518]/90 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <SendaLogo size={28} showText={false} />
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Crie sua Identidade</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Como seus contatos verão você no SENDA.</p>
                </div>
              </div>

              <form onSubmit={validateAndProceed} className="space-y-4">
                <Input
                  label="Seu Nome Completo ou Apelido"
                  placeholder="Ex: Bruno Carvalho"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  error={nameError}
                  autoFocus
                />

                <div>
                  <Input
                    label="Nome de Usuário (@username único)"
                    placeholder="senda_bruno"
                    leftElement={<span className="text-sm font-semibold text-neutral-400 select-none">@</span>}
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''));
                      if (usernameError) setUsernameError('');
                    }}
                    onBlur={handleUsernameBlur}
                    error={usernameError}
                    hint={isCheckingUsername ? "Verificando disponibilidade no Cloud Firestore..." : "Seus contatos poderão encontrar você por este identificador."}
                  />
                  {usernameError && (usernameError.includes('já existe') || usernameError.includes('cadastrada') || usernameError.includes('duplicad')) && (
                    <button
                      type="button"
                      onClick={() => {
                        setRecoverIdentifier(username ? `@${username}` : '');
                        setStep('recover');
                      }}
                      className="mt-1.5 text-xs text-[var(--senda-accent)] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <span>Entrar ou recuperar esta conta existente agora →</span>
                    </button>
                  )}
                </div>

                <Input
                  label="Senha da Conta"
                  type="password"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={passwordError}
                  hint="Necessária para proteger sua conta contra roubo ao recuperar em outro celular."
                />

                <Input
                  label="Confirmar Senha"
                  type="password"
                  placeholder="Repita a senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  error={confirmPasswordError}
                  hint="Confirme sua palavra-passe para garantir que está correta."
                />

                <div className="flex flex-col gap-2 text-left">
                  <label className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                    Foto de Perfil do Dispositivo (Opcional)
                  </label>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleDevicePhoto}
                    className="hidden"
                  />

                  {/* Active Avatar Preview / Camera / Device triggers */}
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/80 dark:border-neutral-800">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-800 shrink-0 border border-neutral-300 dark:border-neutral-700 relative">
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-400 font-semibold text-lg">
                          {displayName ? displayName.charAt(0).toUpperCase() : '?'}
                        </div>
                      )}
                      {avatarUrl && (
                        <button
                          type="button"
                          onClick={() => setAvatarUrl('')}
                          className="absolute inset-0 bg-black/50 text-white opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                          title="Remover foto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
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
                        Do Dispositivo
                      </Button>
                    </div>
                  </div>
                  
                  {/* Preset quick picker */}
                  <div className="flex items-center gap-2 overflow-x-auto pt-1 pb-1">
                    <span className="text-[10px] text-neutral-400 shrink-0">Ou padrão:</span>
                    {PRESET_AVATARS.map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(preset)}
                        className={`w-7 h-7 rounded-full overflow-hidden shrink-0 border-2 transition-all ${
                          avatarUrl === preset ? 'border-[var(--senda-accent)] scale-105' : 'border-transparent opacity-60 hover:opacity-100'
                        }`}
                      >
                        <img src={preset} alt="Avatar opção" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Breve Bio ou Nota Pessoal"
                  placeholder="Ex: Siga em frente. Disponível para conversas."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                />

                <div className="pt-3 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setStep('welcome')}
                    className="w-1/3"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-2/3"
                    rightIcon={<UserCheck className="w-4 h-4" />}
                  >
                    Prosseguir
                  </Button>
                </div>
              </form>
            </motion.div>
          )}

          {step === 'keygen' && (
            <motion.div
              key="keygen"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/90 dark:bg-[#121518]/90 rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-8 text-center shadow-lg"
            >
              <div className="w-14 h-14 rounded-2xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] mx-auto flex items-center justify-center mb-5 animate-pulse">
                <KeyRound className="w-7 h-7" />
              </div>

              <h2 className="text-lg font-bold tracking-tight mb-1">
                Inicializando Identidade Criptográfica
              </h2>

              <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6 leading-relaxed max-w-xs mx-auto">
                Gerando par de chaves P-256 no hardware do seu navegador através da Web Cryptography API oficial.
              </p>

              <div className="flex items-center justify-center gap-2 text-xs text-[var(--senda-accent)] font-medium">
                <span className="w-2 h-2 rounded-full bg-[var(--senda-accent)] animate-ping" />
                Criando identidade segura do dispositivo...
              </div>
            </motion.div>
          )}

          {step === 'recover' && (
            <motion.div
              key="recover"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="bg-white/90 dark:bg-[#121518]/90 backdrop-blur-md rounded-2xl border border-neutral-200/80 dark:border-neutral-800/80 p-6 sm:p-8 shadow-sm"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]">
                  <Smartphone className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight">Recuperar Conta</h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">Encontre seus dados e conversas no Cloud Firestore.</p>
                </div>
              </div>

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!recoverIdentifier.trim()) {
                  setRecoverError('Informe seu @username ou ID de conta.');
                  return;
                }
                if (!recoverPassword.trim()) {
                  setRecoverError('Informe a senha da sua conta para evitar roubo.');
                  return;
                }
                setIsRecovering(true);
                setRecoverError('');
                try {
                  const success = await recoverAccount(recoverIdentifier, recoverPassword);
                  if (!success) {
                    setRecoverError('Conta não encontrada no Firestore com este identificador.');
                  }
                } catch (err: any) {
                  if (err.message === 'INVALID_PASSWORD') {
                    setRecoverError('Senha incorreta. A senha protege sua conta contra acessos não autorizados.');
                  } else {
                    setRecoverError('Erro ao conectar ao Firestore. Tente novamente.');
                  }
                } finally {
                  setIsRecovering(false);
                }
              }} className="space-y-4">
                <Input
                  label="Seu @username ou ID"
                  placeholder="Ex: senda_bruno"
                  leftElement={<span className="text-sm font-semibold text-neutral-400 select-none">@</span>}
                  value={recoverIdentifier}
                  onChange={(e) => setRecoverIdentifier(e.target.value)}
                  autoFocus
                />

                <Input
                  label="Senha da Conta"
                  type="password"
                  placeholder="••••••••"
                  value={recoverPassword}
                  onChange={(e) => setRecoverPassword(e.target.value)}
                  error={recoverError}
                  hint="Digite a senha cadastrada para autenticar e recuperar seus dados do Firestore com segurança."
                />

                <div className="pt-3 flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setStep('welcome')}
                    className="w-1/3"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-2/3"
                    isLoading={isRecovering}
                    rightIcon={<RefreshCw className="w-4 h-4" />}
                  >
                    Recuperar Conta
                  </Button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Device Camera Modal for Profile Photo */}
      <DeviceCameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(img) => setAvatarUrl(img)}
        title="Fotografar Perfil"
      />
    </div>
  );
};
