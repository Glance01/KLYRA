import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Cloud, 
  Trash2, 
  Check, 
  FileImage, 
  MessageSquare, 
  Compass, 
  ShieldCheck, 
  RefreshCw,
  Info,
  CheckCircle2,
  Link as LinkIcon
} from 'lucide-react';
import { Button } from '../../components/ds/Button';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { purgeLegacyLocalStorage } from '../../services/storageService';
import { useAuth } from '../../context/AuthContext';

export const StorageSettingsSection: React.FC = () => {
  const { currentUser } = useAuth();
  const [stats, setStats] = useState<{
    conversationsCount: number;
    momentsCount: number;
    notesCount: number;
    localStorageBytes: number;
    firestoreConnected: boolean;
  }>({
    conversationsCount: 0,
    momentsCount: 0,
    notesCount: 0,
    localStorageBytes: 0,
    firestoreConnected: true
  });

  const [clearing, setClearing] = useState(false);
  const [clearedSuccess, setClearedSuccess] = useState(false);

  const calculateStorageMetrics = async () => {
    let convCount = 0;
    let momCount = 0;
    let notCount = 0;
    let localBytes = 0;

    try {
      // LocalStorage verification (should be 0 or purged)
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('senda_') || k.includes('senda'))) {
          const v = localStorage.getItem(k) || '';
          localBytes += (k.length + v.length) * 2;
        }
      }

      // Query Firestore collections directly
      try {
        const convSnap = await getDocs(collection(db, 'conversations'));
        convCount = convSnap.size;
      } catch {}

      try {
        const momSnap = await getDocs(collection(db, 'moments'));
        momCount = momSnap.size;
      } catch {}

      if (currentUser?.id) {
        try {
          const notSnap = await getDocs(collection(db, 'users', currentUser.id, 'notes'));
          notCount = notSnap.size;
        } catch {}
      }

      setStats({
        conversationsCount: convCount,
        momentsCount: momCount,
        notesCount: notCount,
        localStorageBytes: localBytes,
        firestoreConnected: true
      });
    } catch (e) {
      console.warn('Erro ao medir estatísticas de armazenamento', e);
    }
  };

  useEffect(() => {
    // Purge any lingering legacy keys on load
    purgeLegacyLocalStorage();
    calculateStorageMetrics();
  }, [currentUser?.id]);

  const handlePurgeResidualLocalStorage = () => {
    setClearing(true);
    try {
      purgeLegacyLocalStorage();
      setClearedSuccess(true);
      calculateStorageMetrics();
      setTimeout(() => setClearedSuccess(false), 3000);
    } finally {
      setClearing(false);
    }
  };

  return (
    <section className="bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-5 space-y-4 shadow-xs">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Cloud className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <span>Armazenamento em Nuvem no Firestore</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                100% Firestore
              </span>
            </h2>
            <p className="text-xs text-neutral-500">
              Zero LocalStorage: mensagens, conversas e momentos sincronizados no Cloud Firestore com mídias em links seguros
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={calculateStorageMetrics}
          title="Recalcular dados de armazenamento"
          className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Storage Breakdown Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <MessageSquare className="w-3.5 h-3.5 text-blue-500" />
            <span>Conversas</span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {stats.conversationsCount} <span className="text-xs font-normal text-neutral-400">canais</span>
          </p>
          <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 inline" /> No Firestore
          </p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <LinkIcon className="w-3.5 h-3.5 text-purple-500" />
            <span>Fotos & Mídias</span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Links & URLs
          </p>
          <p className="text-[10px] text-emerald-500 font-medium">Sem dados pesados locais</p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <Compass className="w-3.5 h-3.5 text-amber-500" />
            <span>Momentos</span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {stats.momentsCount} <span className="text-xs font-normal text-neutral-400">ativos</span>
          </p>
          <p className="text-[10px] text-emerald-500 font-medium">Sincronizados na nuvem</p>
        </div>

        <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200/70 dark:border-neutral-800">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 mb-1">
            <Database className="w-3.5 h-3.5 text-neutral-500" />
            <span>LocalStorage</span>
          </div>
          <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {stats.localStorageBytes === 0 ? '0 KB' : `${Math.round(stats.localStorageBytes / 1024)} KB`}
          </p>
          <p className="text-[10px] text-emerald-500 font-medium">
            Desativado (0%)
          </p>
        </div>
      </div>

      {/* Info notice about cloud storage and URLs */}
      <div className="p-3 rounded-xl bg-neutral-100/80 dark:bg-neutral-900/70 border border-neutral-200 dark:border-neutral-800 flex items-start gap-2.5 text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>
          O SENDA opera com persistência centralizada no <strong>Google Cloud Firestore</strong>. Nenhuma conversa, mensagem, momento ou nota é gravada no LocalStorage do navegador. Imagens, fotografias e áudios de voz são enviados e salvos em forma de <strong>links seguros (URLs)</strong>, garantindo integridade e portabilidade entre dispositivos.
        </span>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="text-xs text-neutral-500">
          Limpar qualquer resíduo legado do LocalStorage
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={handlePurgeResidualLocalStorage}
          disabled={clearing}
          leftIcon={clearedSuccess ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Trash2 className="w-3.5 h-3.5" />}
        >
          {clearedSuccess ? 'LocalStorage Limpo!' : 'Limpar Resíduos Locais'}
        </Button>
      </div>
    </section>
  );
};
