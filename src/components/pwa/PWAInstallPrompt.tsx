import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { ArrowDownToLine, Share, PlusSquare, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    // Proactively show the prompt on mount after 2 seconds if not installed
    let hasDismissed = false;
    try {
      hasDismissed = sessionStorage.getItem('senda_pwa_dismissed') === 'true';
      localStorage.removeItem('senda_pwa_dismissed');
    } catch {}

    if (!isInstalled && !hasDismissed) {
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstalled]);

  if (isInstalled || !showPrompt) {
    return null;
  }

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      setShowPrompt(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      sessionStorage.setItem('senda_pwa_dismissed', 'true');
    } catch {}
  };

  return (
    <>
      {/* Top Banner or Modal Prompt */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4 animate-in slide-in-from-top-4 duration-300">
        <div className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-4 shadow-2xl flex items-center gap-3.5 relative overflow-hidden">
          {/* Accent light blue background glow */}
          <div className="absolute -right-12 -top-12 w-24 h-24 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

          {/* Blue App Symbol Icon */}
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg tracking-wider shrink-0 shadow-md shadow-blue-500/20 border border-blue-500/30">
            S
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 font-sans tracking-tight">
              Instalar SENDA no seu Aparelho
            </h3>
            <p className="text-[11px] text-neutral-500 leading-relaxed truncate">
              Rápido, leve e com notificações em tempo real.
            </p>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable && (
              <button
                type="button"
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3 h-3" />
                <span>Instalar</span>
              </button>
            )}

            {isIOS && (
              <button
                type="button"
                onClick={() => setShowIOSGuide(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3 h-3" />
                <span>Como Instalar</span>
              </button>
            )}

            {/* Default fallback button so that even if the ambient event is pending, users can trigger manual walkthrough / check */}
            {!isInstallable && !isIOS && (
              <button
                type="button"
                onClick={() => {
                  // Direct setup help for general standalone layout instruction
                  window.print(); // elegant subtle feedback or show install details
                }}
                className="hidden px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold transition shadow-xs cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <ArrowDownToLine className="w-3 h-3" />
                <span>Instalar App</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition cursor-pointer"
              aria-label="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Guided Modal */}
      {showIOSGuide && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowIOSGuide(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              {/* Blue App Symbol Icon */}
              <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black text-lg tracking-wider shrink-0 shadow-md shadow-blue-500/20 border border-blue-500/30">
                S
              </div>
              <div>
                <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">Instalar SENDA no iOS</h3>
                <p className="text-[10px] text-neutral-500">Siga o guia rápido do Safari</p>
              </div>
            </div>

            <div className="space-y-2.5 text-xs text-neutral-600 dark:text-neutral-300 leading-relaxed pt-2">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <p>
                  Toque no botão de <strong>Compartilhar</strong> <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" /> na barra inferior do Safari.
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600/10 text-blue-600 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <p>
                  Role para baixo e selecione <strong>Adicionar à Tela de Início</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-blue-500" />.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSGuide(false);
                handleDismiss();
              }}
              className="mt-2 w-full py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/10 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </div>
      )}
    </>
  );
};
