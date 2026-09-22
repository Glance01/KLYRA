import React, { useState, useEffect } from 'react';
import { collection, doc, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { Button } from '../../components/ds/Button';
import { Input } from '../../components/ds/Input';
import { 
  FileText, 
  Plus, 
  Link as LinkIcon, 
  Image as ImageIcon, 
  Trash2, 
  Copy, 
  Check, 
  ShieldCheck, 
  Pin 
} from 'lucide-react';

interface PersonalNote {
  id: string;
  title?: string;
  content: string;
  category: 'note' | 'link' | 'media';
  url?: string;
  isPinned: boolean;
  createdAt: string;
}

export const NotesView: React.FC = () => {
  const { currentUser } = useAuth();
  const { t } = useTheme();

  const getLocalizedInitialNotes = (): PersonalNote[] => [
    {
      id: 'note_1',
      title: t('notes.designNoteTitle', 'Idéias de Design SENDA'),
      content: t('notes.designNoteContent', 'Priorizar o silêncio visual, tipografia geométrica humanista e estados sutis de entrega.'),
      category: 'note',
      isPinned: true,
      createdAt: t('notes.now', 'Agora mesmo')
    },
    {
      id: 'note_2',
      title: t('notes.cryptoNoteTitle', 'Link de Referência Criptográfica'),
      content: t('notes.cryptoNoteContent', 'Especificação W3C Web Cryptography API sobre P-256 e AES-GCM.'),
      category: 'link',
      url: 'https://w3c.github.io/webcrypto/',
      isPinned: false,
      createdAt: t('notes.yesterday', 'Ontem')
    }
  ];

  const [notes, setNotes] = useState<PersonalNote[]>(getLocalizedInitialNotes());
  const [activeTab, setActiveTab] = useState<'all' | 'note' | 'link' | 'media'>('all');
  const [newContent, setNewContent] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newCategory, setNewCategory] = useState<'note' | 'link' | 'media'>('note');
  const [isAdding, setIsAdding] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Clean legacy localStorage cache
  useEffect(() => {
    try {
      localStorage.removeItem('senda_personal_notes');
    } catch {}
  }, []);

  const userId = currentUser?.id || 'usr_me';

  // Real-time Firestore synchronization for Notes
  useEffect(() => {
    const notesColRef = collection(db, 'users', userId, 'notes');

    const unsubscribe = onSnapshot(notesColRef, async (snapshot) => {
      if (snapshot.empty) {
        // Seed initial notes directly into Firestore
        const initials = getLocalizedInitialNotes();
        for (const item of initials) {
          try {
            await setDoc(doc(db, 'users', userId, 'notes', item.id), item, { merge: true });
          } catch {}
        }
      } else {
        const firestoreNotes: PersonalNote[] = [];
        snapshot.docs.forEach((docSnap) => {
          firestoreNotes.push(docSnap.data() as PersonalNote);
        });

        firestoreNotes.sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0));
        setNotes(firestoreNotes);
      }
    }, (err) => {
      console.warn('[Firestore Notes Sync]:', err);
    });

    return () => unsubscribe();
  }, [userId]);

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const note: PersonalNote = {
      id: `note_${Date.now()}`,
      title: newTitle.trim() || undefined,
      content: newContent.trim(),
      category: newCategory,
      url: newUrl.trim() || undefined,
      isPinned: false,
      createdAt: t('notes.now', 'Agora mesmo')
    };

    setNotes(prev => [note, ...prev]);
    setNewContent('');
    setNewTitle('');
    setNewUrl('');
    setIsAdding(false);

    // Save directly to Firestore
    try {
      await setDoc(doc(db, 'users', userId, 'notes', note.id), note);
    } catch (err) {
      console.warn('Erro ao salvar nota no Firestore:', err);
    }
  };

  const handleDelete = async (id: string) => {
    setNotes(prev => prev.filter(n => n.id !== id));
    try {
      await deleteDoc(doc(db, 'users', userId, 'notes', id));
    } catch (err) {
      console.warn('Erro ao deletar nota do Firestore:', err);
    }
  };

  const handleTogglePin = async (id: string) => {
    const target = notes.find(n => n.id === id);
    if (!target) return;
    const nextPinned = !target.isPinned;

    setNotes(prev => prev.map(n => n.id === id ? { ...n, isPinned: nextPinned } : n));

    try {
      await setDoc(doc(db, 'users', userId, 'notes', id), { isPinned: nextPinned }, { merge: true });
    } catch (err) {
      console.warn('Erro ao alterar pin no Firestore:', err);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filtered = notes.filter(n => {
    if (activeTab === 'all') return true;
    return n.category === activeTab;
  });

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span>{t('notes.personalVault', 'Cofre Pessoal')}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('notes.title', 'Notas Privadas')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('notes.subtitle', 'Anotações encriptadas salvas localmente e na nuvem')}
          </p>
        </div>

        <Button
          size="md"
          onClick={() => setIsAdding(!isAdding)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          {t('notes.newNote', 'Criar Nota')}
        </Button>
      </div>

      {/* New Note Creator Drawer / Form */}
      {isAdding && (
        <form 
          onSubmit={handleAddNote}
          className="p-5 bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 space-y-4 shadow-sm animate-in fade-in"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
              {t('notes.registerPersonalNote', 'Registrar Nota Pessoal')}
            </h2>
            <div className="flex items-center gap-1">
              {[
                { cat: 'note' as const, label: t('notes.typeText', 'Texto'), icon: <FileText className="w-3.5 h-3.5" /> },
                { cat: 'link' as const, label: t('notes.typeLink', 'Link'), icon: <LinkIcon className="w-3.5 h-3.5" /> },
                { cat: 'media' as const, label: t('notes.typeMedia', 'Foto'), icon: <ImageIcon className="w-3.5 h-3.5" /> },
              ].map((opt) => (
                <button
                  key={opt.cat}
                  type="button"
                  onClick={() => setNewCategory(opt.cat)}
                  className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1.5 transition-colors ${
                    newCategory === opt.cat
                      ? 'bg-[var(--senda-accent)] text-white font-medium'
                      : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                  }`}
                >
                  {opt.icon}
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <Input
            placeholder={t('notes.titleLabel', 'Título (opcional)')}
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />

          <div className="flex flex-col gap-1.5 text-left">
            <textarea
              rows={3}
              placeholder={t('notes.textareaPlaceholder', 'Escreva seus pensamentos ou cole um conteúdo para guardar...')}
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              required
              className="w-full bg-neutral-100/80 dark:bg-neutral-900/90 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3 text-sm text-neutral-900 dark:text-neutral-100 outline-none focus:border-[var(--senda-accent)]"
            />
          </div>

          {newCategory === 'link' && (
            <Input
              placeholder={t('notes.urlPlaceholder', 'URL do Link (https://...)')}
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
          )}

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsAdding(false)}
            >
              {t('notes.cancel', 'Cancelar')}
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
            >
              {t('notes.saveInVault', 'Salvar no Cofre')}
            </Button>
          </div>
        </form>
      )}

      {/* Category Tabs */}
      <div className="flex items-center gap-2 text-xs border-b border-neutral-100 dark:border-neutral-800 pb-2">
        {[
          { id: 'all' as const, label: t('notes.tabAll', 'Todas as Notas') },
          { id: 'note' as const, label: t('notes.tabText', 'Textos') },
          { id: 'link' as const, label: t('notes.tabLink', 'Links') },
          { id: 'media' as const, label: t('notes.tabMedia', 'Mídias') },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              activeTab === tab.id
                ? 'bg-neutral-200/80 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((note) => (
          <div
            key={note.id}
            className="p-4 rounded-2xl bg-white dark:bg-[#121518] border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {note.isPinned && (
                    <Pin className="w-3 h-3 text-[var(--senda-accent)] shrink-0" />
                  )}
                  <h3 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate">
                    {note.title || t('notes.noteQuick', 'Nota Rápida')}
                  </h3>
                </div>

                <span className="text-[10px] text-neutral-400 font-mono">
                  {note.createdAt}
                </span>
              </div>

              <p className="text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {note.content}
              </p>

              {note.url && (
                <a
                  href={note.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-[var(--senda-accent)] hover:underline truncate max-w-full"
                >
                  <LinkIcon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{note.url}</span>
                </a>
              )}
            </div>

            <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-neutral-400">
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                <ShieldCheck className="w-3 h-3" />
                <span>{t('notes.privateLabel', 'Privado')}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleTogglePin(note.id)}
                  title={t('notes.pinTooltip', 'Fixar nota')}
                  className="p-1 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  <Pin className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy(note.id, note.content)}
                  title={t('notes.copyTooltip', 'Copiar texto')}
                  className="p-1 hover:text-neutral-800 dark:hover:text-neutral-200 transition-colors cursor-pointer"
                >
                  {copiedId === note.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(note.id)}
                  title={t('notes.deleteTooltip', 'Apagar nota')}
                  className="p-1 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
