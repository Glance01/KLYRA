import React, { useState } from 'react';
import { INITIAL_CONTACTS } from '../../services/initialData';
import { UserProfile } from '../../types';
import { useConversations } from '../../context/ConversationContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { useCall } from '../../context/CallContext';
import { Avatar } from '../../components/ds/Avatar';
import { Input } from '../../components/ds/Input';
import { Button } from '../../components/ds/Button';
import { 
  Users, 
  Search, 
  UserPlus, 
  QrCode, 
  MessageSquare, 
  Check, 
  X, 
  ShieldCheck, 
  Share2,
  Camera,
  Phone,
  Video,
  Info,
  Trash2,
  Lock,
  Plus
} from 'lucide-react';

interface PeopleViewProps {
  onOpenConversation: () => void;
  onStartCall?: (contact: UserProfile, type: 'audio' | 'video') => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({ onOpenConversation, onStartCall }) => {
  const { t } = useTheme();
  const { currentUser } = useAuth();
  const { startCall } = useCall();
  const { 
    conversations, 
    selectConversation, 
    createGroupConversation, 
    createDirectConversation 
  } = useConversations();

  const [contacts, setContacts] = useState<UserProfile[]>(INITIAL_CONTACTS);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [selectedContactDetail, setSelectedContactDetail] = useState<UserProfile | null>(null);

  // Group creation state
  const [groupTitle, setGroupTitle] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [groupCreateError, setGroupCreateError] = useState('');

  // New person input state
  const [targetUsername, setTargetUsername] = useState('');
  const [foundUser, setFoundUser] = useState<UserProfile | null>(null);
  const [addSuccess, setAddSuccess] = useState(false);

  // Filter contacts and ensure current user is NEVER listed (cannot call/add oneself)
  const filteredContacts = contacts
    .filter(c => c.id !== currentUser?.id && c.username.toLowerCase() !== currentUser?.username?.toLowerCase())
    .filter(c => 
      c.displayName.toLowerCase().includes(search.toLowerCase()) ||
      c.username.toLowerCase().includes(search.toLowerCase()) ||
      c.bio?.toLowerCase().includes(search.toLowerCase())
    );

  const handleStartChatWith = (user: UserProfile) => {
    createDirectConversation(user);
    onOpenConversation();
  };

  const handleStartCallWith = (user: UserProfile, type: 'audio' | 'video') => {
    if (user.id === currentUser?.id || user.username.toLowerCase() === currentUser?.username?.toLowerCase()) {
      return;
    }
    startCall(user, type);
  };

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupTitle.trim()) {
      setGroupCreateError('Digite um nome para o grupo');
      return;
    }
    if (selectedGroupMemberIds.length === 0) {
      setGroupCreateError('Selecione ao menos um contato para o grupo');
      return;
    }

    createGroupConversation(groupTitle.trim(), selectedGroupMemberIds);
    setShowGroupModal(false);
    setGroupTitle('');
    setSelectedGroupMemberIds([]);
    setGroupCreateError('');
    onOpenConversation();
  };

  const toggleGroupMember = (id: string) => {
    setSelectedGroupMemberIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const handleSearchUserToAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = targetUsername.replace(/^@/, '').trim().toLowerCase();
    if (!clean) return;

    const mockFound: UserProfile = {
      id: `usr_${clean}`,
      username: clean,
      displayName: clean.charAt(0).toUpperCase() + clean.slice(1),
      bio: 'Usuário conectado via rede segura SENDA.',
      presence: {
        status: 'available',
        customMessage: 'Disponível',
        visibility: 'everyone',
        updatedAt: new Date().toISOString()
      },
      createdAt: new Date().toISOString(),
      deviceId: `dev_${clean}_sec`
    };

    setFoundUser(mockFound);
  };

  const handleConfirmAdd = () => {
    if (!foundUser) return;
    if (!contacts.some(c => c.username === foundUser.username)) {
      setContacts([...contacts, foundUser]);
    }
    setAddSuccess(true);
    setTimeout(() => {
      setAddSuccess(false);
      setShowAddModal(false);
      setFoundUser(null);
      setTargetUsername('');
    }, 1200);
  };

  const handleRemoveContact = (contactId: string) => {
    setContacts(prev => prev.filter(c => c.id !== contactId));
    if (selectedContactDetail?.id === contactId) {
      setSelectedContactDetail(null);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200/80 dark:border-neutral-800 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-[var(--senda-accent)] uppercase tracking-wider mb-1">
            <Users className="w-3.5 h-3.5" />
            <span>Diretório & Contatos</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 font-sans">
            {t('people.title', 'Pessoas & Contatos')}
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {t('people.subtitle', 'Conecte-se com segurança por username')}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowGroupModal(true)}
            leftIcon={<Users className="w-4 h-4" />}
          >
            Novo Grupo
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowAddModal(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Adicionar Contato
          </Button>

          <button
            type="button"
            onClick={() => setShowScannerModal(true)}
            className="p-2 rounded-xl border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 transition-colors cursor-pointer"
            title="Escanear QR Code de Contato"
          >
            <QrCode className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="w-full">
        <Input
          placeholder="Filtrar por nome, @usuário ou biografia..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          leftElement={<Search className="w-4 h-4 text-neutral-400" />}
          className="h-10"
        />
      </div>

      {/* Contacts List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {filteredContacts.map((contact) => (
          <div
            key={contact.id}
            className="p-4 rounded-2xl bg-white dark:bg-[#121518] border border-neutral-200/80 dark:border-neutral-800 flex items-center justify-between gap-3 shadow-xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all group"
          >
            <div 
              className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
              onClick={() => setSelectedContactDetail(contact)}
            >
              <Avatar
                name={contact.displayName}
                src={contact.avatarUrl}
                presence={contact.presence?.status}
                size="md"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100 truncate group-hover:text-[var(--senda-accent)] transition-colors">
                    {contact.displayName}
                  </h3>
                  <span title="Identidade E2EE verificada">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  </span>
                </div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono truncate">
                  @{contact.username}
                </p>
                {contact.bio && (
                  <p className="text-[11px] text-neutral-400 dark:text-neutral-500 truncate mt-0.5">
                    {contact.bio}
                  </p>
                )}
              </div>
            </div>

            {/* Quick Chat / Call / Info Actions */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => handleStartCallWith(contact, 'audio')}
                className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-[var(--senda-accent)] hover:bg-[var(--senda-accent-subtle)] transition-colors cursor-pointer"
                title="Chamada de voz"
              >
                <Phone className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleStartCallWith(contact, 'video')}
                className="p-2 rounded-xl text-neutral-600 dark:text-neutral-400 hover:text-[var(--senda-accent)] hover:bg-[var(--senda-accent-subtle)] transition-colors cursor-pointer"
                title="Chamada de vídeo"
              >
                <Video className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleStartChatWith(contact)}
                className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)] hover:opacity-85 transition-opacity cursor-pointer"
                title="Conversar com segurança"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setSelectedContactDetail(contact)}
                className="p-2 rounded-xl text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
                title="Ver detalhes de segurança"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredContacts.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <p className="text-sm text-neutral-500">Nenhum contato encontrado para &quot;{search}&quot;</p>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {showGroupModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowGroupModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Criar Grupo Criptografado</h3>
                  <p className="text-xs text-neutral-500">Comunicação coletiva E2EE</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGroupModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Nome do Grupo
                </label>
                <Input
                  placeholder="Ex: Projeto Arquitetura, Família, Estúdio"
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Selecione os Participantes ({selectedGroupMemberIds.length} selecionados)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-neutral-200 dark:border-neutral-800 rounded-xl p-2">
                  {contacts.map((contact) => {
                    const isSelected = selectedGroupMemberIds.includes(contact.id);
                    return (
                      <div
                        key={contact.id}
                        onClick={() => toggleGroupMember(contact.id)}
                        className={`p-2 rounded-lg flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected 
                            ? 'bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]' 
                            : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Avatar name={contact.displayName} src={contact.avatarUrl} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-neutral-900 dark:text-neutral-100">{contact.displayName}</p>
                            <p className="text-[10px] text-neutral-400 font-mono">@{contact.username}</p>
                          </div>
                        </div>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          isSelected ? 'bg-[var(--senda-accent)] border-[var(--senda-accent)] text-white' : 'border-neutral-300 dark:border-neutral-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {groupCreateError && (
                <p className="text-xs text-rose-500 font-medium">{groupCreateError}</p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="md" onClick={() => setShowGroupModal(false)}>
                  Cancelar
                </Button>
                <Button variant="primary" size="md" type="submit">
                  Criar Grupo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONTACT DETAIL DRAWER / MODAL */}
      {selectedContactDetail && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setSelectedContactDetail(null)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Avatar
                  name={selectedContactDetail.displayName}
                  src={selectedContactDetail.avatarUrl}
                  presence={selectedContactDetail.presence?.status}
                  size="lg"
                />
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                    {selectedContactDetail.displayName}
                  </h3>
                  <p className="text-xs text-neutral-500 font-mono">@{selectedContactDetail.username}</p>
                  <div className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Criptografia E2EE Verificada</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedContactDetail(null)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedContactDetail.bio && (
              <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900/70 border border-neutral-100 dark:border-neutral-800">
                <p className="text-xs text-neutral-400 font-medium mb-0.5 uppercase tracking-wider">Biografia</p>
                <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {selectedContactDetail.bio}
                </p>
              </div>
            )}

            {/* Safety details & Device Fingerprint */}
            <div className="space-y-2">
              <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                Segurança Criptográfica
              </p>
              <div className="p-3 rounded-xl bg-neutral-100 dark:bg-neutral-900 text-xs font-mono space-y-1 text-neutral-600 dark:text-neutral-400">
                <div className="flex justify-between">
                  <span>Dispositivo:</span>
                  <span className="text-neutral-900 dark:text-neutral-200">{selectedContactDetail.deviceId}</span>
                </div>
                <div className="flex justify-between">
                  <span>Cifra P2P:</span>
                  <span className="text-neutral-900 dark:text-neutral-200">AES-256-GCM / Ed25519</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  handleStartChatWith(selectedContactDetail);
                  setSelectedContactDetail(null);
                }}
                leftIcon={<MessageSquare className="w-4 h-4" />}
              >
                Conversar
              </Button>
              <Button
                variant="secondary"
                size="md"
                onClick={() => handleRemoveContact(selectedContactDetail.id)}
                leftIcon={<Trash2 className="w-4 h-4 text-rose-500" />}
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CONTACT MODAL */}
      {showAddModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowAddModal(false)}
        >
          <div 
            className="w-full max-w-md bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-[var(--senda-accent-subtle)] text-[var(--senda-accent)]">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold tracking-tight">Adicionar Novo Contato</h3>
                  <p className="text-xs text-neutral-500">Busca federada e segura no SENDA</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSearchUserToAdd} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Identificador de Usuário
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="ex: roberto_silva"
                    value={targetUsername}
                    onChange={(e) => setTargetUsername(e.target.value)}
                    className="flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="md">
                    Buscar
                  </Button>
                </div>
              </div>
            </form>

            {foundUser && (
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-3">
                <div className="flex items-center gap-3">
                  <Avatar name={foundUser.displayName} size="md" />
                  <div>
                    <h4 className="text-sm font-bold">{foundUser.displayName}</h4>
                    <p className="text-xs text-neutral-500 font-mono">@{foundUser.username}</p>
                  </div>
                </div>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">{foundUser.bio}</p>

                <Button
                  variant="primary"
                  size="sm"
                  className="w-full"
                  onClick={handleConfirmAdd}
                  leftIcon={addSuccess ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                >
                  {addSuccess ? 'Contato Adicionado!' : 'Confirmar Adição'}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SCANNER MODAL */}
      {showScannerModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          onClick={() => setShowScannerModal(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-[#121518] rounded-2xl border border-neutral-200/80 dark:border-neutral-800 p-6 shadow-2xl space-y-5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold tracking-tight">Escanear Chave Pública</h3>
              <button
                type="button"
                onClick={() => setShowScannerModal(false)}
                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="w-full h-56 rounded-2xl bg-neutral-900 relative overflow-hidden flex items-center justify-center border-2 border-dashed border-white/20">
              <div className="absolute inset-x-4 h-0.5 bg-[var(--senda-accent)] shadow-[0_0_8px_var(--senda-accent)] animate-bounce" />
              <Camera className="w-10 h-10 text-neutral-500" />
            </div>

            <p className="text-xs text-neutral-500 leading-relaxed">
              Aponte a câmera para o QR Code de contato no dispositivo da outra pessoa para validar as chaves Ed25519 instantaneamente.
            </p>

            <Button variant="secondary" size="md" className="w-full" onClick={() => setShowScannerModal(false)}>
              Fechar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
