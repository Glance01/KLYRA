import React, { useState } from 'react';
import { useTheme, ACCENT_PRESETS } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { AccentPresetId, ThemeMode, FontSizeOption, RadiusOption, DensityOption, BubbleStyle, LanguageOption } from '../../types';
import { Button } from '../../components/ds/Button';
import { Avatar } from '../../components/ds/Avatar';
import { 
  Sun, 
  Moon, 
  Smartphone, 
  Check, 
  RotateCcw, 
  Sliders, 
  Volume2, 
  Sparkles,
  MessageSquare,
  Globe,
  Save,
  Cloud,
  CheckCircle2,
  Loader2
} from 'lucide-react';

export const PersonalizationView: React.FC = () => {
  const {
    settings,
    currentAccent,
    isSavingToCloud,
    saveStatus,
    setThemeMode,
    setAccent,
    setFontSize,
    setRadius,
    setDensity,
    setBubbleStyle,
    setLanguage,
    toggleAnimations,
    toggleSound,
    savePersonalizationToCloud,
    resetToDefaults,
    t
  } = useTheme();

  const { currentUser } = useAuth();

  const [customHexInput, setCustomHexInput] = useState(settings.customAccentHex || '#3B82F6');

  const themeOptions: { mode: ThemeMode; labelKey: string; defaultLabel: string; icon: React.ReactNode }[] = [
    { mode: 'light', labelKey: 'personalization.light', defaultLabel: 'Claro', icon: <Sun className="w-4 h-4" /> },
    { mode: 'dark', labelKey: 'personalization.dark', defaultLabel: 'Escuro', icon: <Moon className="w-4 h-4" /> },
    { mode: 'auto', labelKey: 'personalization.auto', defaultLabel: 'Automático (Sistema)', icon: <Smartphone className="w-4 h-4" /> },
  ];

  const languageOptions: { id: LanguageOption; label: string; flag: string; region: string }[] = [
    { id: 'pt-BR', label: 'Português', flag: '🇧🇷', region: 'Brasil' },
    { id: 'pt-PT', label: 'Português', flag: '🇵🇹', region: 'Portugal' },
    { id: 'en-US', label: 'English', flag: '🇺🇸', region: 'United States' },
    { id: 'es-ES', label: 'Español', flag: '🇪🇸', region: 'España' },
  ];

  const fontSizeOptions: { id: FontSizeOption; label: string; desc: string }[] = [
    { id: 'sm', label: t('personalization.fontCompact', 'Compacta'), desc: '14px' },
    { id: 'base', label: t('personalization.fontDefault', 'Padrão'), desc: '15px' },
    { id: 'lg', label: t('personalization.fontLarge', 'Ampliada'), desc: '16.5px' },
  ];

  const radiusOptions: { id: RadiusOption; label: string; desc: string }[] = [
    { id: 'sharp', label: t('personalization.radiusSharp', 'Reto'), desc: '4px' },
    { id: 'medium', label: t('personalization.radiusMedium', 'Harmônico'), desc: '10px' },
    { id: 'rounded', label: t('personalization.radiusRounded', 'Arredondado'), desc: '16px' },
  ];

  const densityOptions: { id: DensityOption; label: string; desc: string }[] = [
    { id: 'compact', label: t('personalization.densityCompact', 'Densa'), desc: t('personalization.densityCompactDesc', 'Mais itens por tela') },
    { id: 'comfortable', label: t('personalization.densityComfortable', 'Confortável'), desc: t('personalization.densityComfortableDesc', 'Equilíbrio ideal') },
    { id: 'spacious', label: t('personalization.densitySpacious', 'Espaçosa'), desc: t('personalization.densitySpaciousDesc', 'Respiro amplo') },
  ];

  const bubbleStyleOptions: { id: BubbleStyle; label: string; desc: string }[] = [
    { id: 'minimal', label: t('personalization.bubbleMinimal', 'Minimalista'), desc: t('personalization.bubbleMinimalDesc', 'Sem borda pesada, fundo suave') },
    { id: 'bordered', label: t('personalization.bubbleBordered', 'Contornada'), desc: t('personalization.bubbleBorderedDesc', 'Traço sutil e nítido') },
    { id: 'soft', label: t('personalization.bubbleSoft', 'Suave'), desc: t('personalization.bubbleSoftDesc', 'Leve relevo discreto') },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6 space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>{t('personalization.visualConfig', 'Configurações Visuais')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('personalization.title', 'Personalização')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('personalization.subtitle', 'Ajuste a atmosfera, cores e ritmo visual do seu SENDA em tempo real.')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={resetToDefaults}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            {t('personalization.restoreDefaults', 'Restaurar Padrões')}
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => savePersonalizationToCloud(currentUser?.id)}
            disabled={isSavingToCloud}
            leftIcon={isSavingToCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          >
            {isSavingToCloud ? t('personalization.savingCloud', 'Salvando...') : t('personalization.saveCloud', 'Salvar na Nuvem')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Settings Column (Left / Main) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Tema Geral */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('personalization.themeAppearance', 'Aparência do Tema')}
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              {themeOptions.map((opt) => {
                const isSelected = settings.themeMode === opt.mode;
                return (
                  <button
                    key={opt.mode}
                    type="button"
                    onClick={() => setThemeMode(opt.mode)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <span className="mb-1.5">{opt.icon}</span>
                    <span className="text-xs font-medium">{t(opt.labelKey, opt.defaultLabel)}</span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 2. Cor de Destaque */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                {t('personalization.accentColor', 'Cor de Destaque')}
              </h2>
              <span className="text-xs text-neutral-500 font-normal">
                {currentAccent.name}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('personalization.accentColorDesc', 'Aparece cirurgicamente em botões ativos, indicadores, links e seleções.')}
            </p>

            {/* Presets Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2.5 pt-1">
              {(Object.keys(ACCENT_PRESETS) as AccentPresetId[])
                .filter(id => id !== 'custom')
                .map((key) => {
                  const preset = ACCENT_PRESETS[key];
                  const isSelected = settings.accent === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setAccent(key)}
                      title={preset.name}
                      className="group flex flex-col items-center gap-1.5 p-2 rounded-xl border border-transparent hover:border-neutral-200 dark:hover:border-neutral-800 transition-all cursor-pointer"
                    >
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-105"
                        style={{ backgroundColor: preset.hex }}
                      >
                        {isSelected && <Check className="w-4 h-4 text-white drop-shadow-xs" />}
                      </span>
                      <span className="text-[10px] text-neutral-600 dark:text-neutral-400 truncate max-w-full text-center">
                        {preset.name.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
            </div>

            {/* Custom Color Selector */}
            <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                  {t('personalization.customColorLabel', 'Cor Personalizada:')}
                </span>
                <input
                  type="color"
                  value={customHexInput}
                  onChange={(e) => {
                    const newHex = e.target.value;
                    setCustomHexInput(newHex);
                    setAccent('custom', newHex);
                  }}
                  className="w-7 h-7 rounded-lg border-0 cursor-pointer p-0 bg-transparent"
                />
                <span className="text-xs font-mono text-neutral-500 uppercase">{customHexInput}</span>
              </div>

              {settings.accent === 'custom' && (
                <span className="text-xs text-[var(--senda-accent)] font-medium">
                  {t('personalization.active', 'Ativa')}
                </span>
              )}
            </div>
          </section>

          {/* 3. Tipografia e Escala */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('personalization.fontSize', 'Tamanho da Fonte')}
            </h2>
            <div className="grid grid-cols-3 gap-2.5">
              {fontSizeOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setFontSize(opt.id)}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                    settings.fontSize === opt.id
                      ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                      : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                  }`}
                >
                  <p className="text-xs font-semibold">{opt.label}</p>
                  <p className="text-[10px] opacity-75 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* 4. Arredondamento e Densidade */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                {t('personalization.radius', 'Arredondamento dos Cantos')}
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {radiusOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setRadius(opt.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.radius === opt.id
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-75">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                {t('personalization.density', 'Densidade Visual')}
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {densityOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDensity(opt.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.density === opt.id
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-75">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
              <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight mb-2">
                {t('personalization.bubbleStyle', 'Aparência das Mensagens')}
              </h2>
              <div className="grid grid-cols-3 gap-2.5">
                {bubbleStyleOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setBubbleStyle(opt.id)}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                      settings.bubbleStyle === opt.id
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                        : 'border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <p className="text-xs font-semibold">{opt.label}</p>
                    <p className="text-[10px] opacity-75">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* 5. Efeitos & Sons */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
              {t('personalization.fluency', 'Fluidez & Feedback')}
            </h2>
            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-xs font-medium">{t('personalization.smoothAnimations', 'Microanimações Suaves')}</p>
                    <p className="text-[11px] text-neutral-500">{t('personalization.smoothAnimationsDesc', 'Transições orgânicas de 150 a 300ms')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableAnimations}
                  onChange={(e) => toggleAnimations(e.target.checked)}
                  className="rounded text-[var(--senda-accent)] focus:ring-0 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <div className="flex items-center gap-2.5">
                  <Volume2 className="w-4 h-4 text-neutral-500" />
                  <div>
                    <p className="text-xs font-medium">{t('personalization.discreteSounds', 'Sons Discretos de Notificação')}</p>
                    <p className="text-[11px] text-neutral-500">{t('personalization.discreteSoundsDesc', 'Feedback acústico sutil ao enviar e receber')}</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.soundEnabled}
                  onChange={(e) => toggleSound(e.target.checked)}
                  className="rounded text-[var(--senda-accent)] focus:ring-0 w-4 h-4"
                />
              </label>
            </div>
          </section>

          {/* 6. Idioma do Aplicativo */}
          <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-[var(--senda-accent)]" />
                <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 tracking-tight">
                  {t('personalization.language', 'Idioma do Aplicativo')}
                </h2>
              </div>
              <span className="text-xs text-neutral-500">
                {languageOptions.find(l => l.id === (settings.language || 'pt-BR'))?.region}
              </span>
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {t('personalization.selectLanguageDesc', 'Selecione o idioma de preferência para mensagens do sistema e interface.')}
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              {languageOptions.map((lang) => {
                const isSelected = (settings.language || 'pt-BR') === lang.id;
                return (
                  <button
                    key={lang.id}
                    type="button"
                    onClick={() => setLanguage(lang.id)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[var(--senda-accent)] bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]'
                        : 'border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 text-neutral-700 dark:text-neutral-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{lang.flag}</span>
                      <div>
                        <p className="text-xs font-semibold">{lang.label}</p>
                        <p className="text-[10px] opacity-75">{lang.region}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-[var(--senda-accent)] shrink-0" />}
                  </button>
                );
              })}
            </div>
          </section>

          {/* 7. Cloud Persistence Action Box */}
          <section className="bg-gradient-to-r from-neutral-900 to-neutral-950 text-white rounded-2xl p-5 space-y-3 border border-neutral-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--senda-accent)]/20 flex items-center justify-center text-[var(--senda-accent)]">
                  <Cloud className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">
                    {t('personalization.cloudSyncTitle', 'Sincronização em Nuvem')}
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    {t('personalization.yourAccount', 'Sua conta:')} <span className="text-neutral-200 font-medium">{currentUser?.displayName || '@brunomuhacha016'}</span>
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-neutral-300 leading-relaxed">
              {t('personalization.cloudSyncDesc', 'Salve todas as preferências de personalização (Tema, Cor de Destaque, Idioma, Fontes) na sua conta em nuvem para aplicar instantaneamente em qualquer dispositivo.')}
            </p>

            {saveStatus && (
              <div className="flex items-center gap-2 text-xs p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveStatus}</span>
              </div>
            )}

            <Button
              variant="primary"
              className="w-full justify-center py-2.5 text-xs font-semibold tracking-wide"
              onClick={() => savePersonalizationToCloud(currentUser?.id)}
              disabled={isSavingToCloud}
              leftIcon={isSavingToCloud ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            >
              {isSavingToCloud ? t('personalization.savingCloud', 'Salvando na Nuvem...') : t('personalization.saveCloud', 'Salvar Alterações na Nuvem')}
            </Button>
          </section>
        </div>

        {/* Real-time Preview Column (Right) */}
        <div className="lg:col-span-5 sticky top-6 space-y-4">
          <div className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[var(--senda-accent)]" />
                {t('personalization.realTimePreview', 'Preview em Tempo Real')}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] font-medium">
                SENDA UI
              </span>
            </div>

            {/* Simulated Chat Interface */}
            <div className="rounded-xl border border-neutral-200/70 dark:border-neutral-800/80 bg-neutral-50 dark:bg-[#0E1013] p-4 space-y-3 overflow-hidden">
              {/* Top Contact Bar in Preview */}
              <div className="flex items-center justify-between border-b border-neutral-200/60 dark:border-neutral-800/60 pb-2.5">
                <div className="flex items-center gap-2.5">
                  <Avatar name="Helena Ramos" presence="available" size="sm" />
                  <div>
                    <p className="text-xs font-semibold leading-tight">Helena Ramos</p>
                    <p className="text-[10px] text-emerald-500 font-medium">{t('common.available', 'Disponível')}</p>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400 font-mono">E2EE</span>
              </div>

              {/* Messages */}
              <div className="space-y-2.5 py-1 text-xs">
                {/* Received message */}
                <div className="flex flex-col items-start max-w-[82%]">
                  <div className={`p-2.5 text-neutral-800 dark:text-neutral-200 ${
                    settings.bubbleStyle === 'bordered'
                      ? 'bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700'
                      : settings.bubbleStyle === 'soft'
                      ? 'bg-neutral-200/70 dark:bg-neutral-800 shadow-xs'
                      : 'bg-neutral-100/90 dark:bg-neutral-800/70'
                  }`} style={{ borderRadius: 'var(--app-radius, 10px)' }}>
                    {t('personalization.previewMsg1', 'Olá! O SENDA está funcionando com a nova paleta?')}
                  </div>
                  <span className="text-[9px] text-neutral-400 mt-1 pl-1">10:42</span>
                </div>

                {/* Sent message */}
                <div className="flex flex-col items-end ml-auto max-w-[82%]">
                  <div className={`p-2.5 text-neutral-900 dark:text-neutral-100 ${
                    settings.bubbleStyle === 'bordered'
                      ? 'bg-[var(--senda-accent-subtle)] border border-[var(--senda-accent)] text-neutral-900 dark:text-neutral-100'
                      : settings.bubbleStyle === 'soft'
                      ? 'bg-[var(--senda-accent-subtle)] shadow-xs'
                      : 'bg-[var(--senda-accent-subtle)]'
                  }`} style={{ borderRadius: 'var(--app-radius, 10px)' }}>
                    {t('personalization.previewMsg2', 'Sim, a cor de destaque e tipografia mudam instantaneamente!')}
                  </div>
                  <div className="flex items-center gap-1 mt-1 pr-1">
                    <span className="text-[9px] text-neutral-400">10:43</span>
                    {/* Discrete Senda read indicator */}
                    <span className="text-[var(--senda-accent)] font-mono text-[9px] font-bold">✓✓</span>
                  </div>
                </div>
              </div>

              {/* Input Simulation */}
              <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800/60 flex items-center gap-2">
                <div className="h-8 bg-neutral-200/60 dark:bg-neutral-800/60 rounded-lg flex-1 px-2.5 flex items-center text-[11px] text-neutral-400">
                  {t('conversations.typeMessage', 'Escreva uma mensagem...')}
                </div>
                <Button size="sm" className="h-8 px-3 text-xs">
                  {t('common.send', 'Enviar')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
