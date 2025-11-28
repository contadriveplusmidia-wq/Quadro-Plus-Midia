import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Settings, Users, Palette, Image, Save, Plus, X, Edit2, Trash2, GripVertical, Lock, CheckCircle, AlertCircle } from 'lucide-react';

const PRESET_COLORS = [
  '#4F46E5', '#8b5cf6', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', 
  '#ef4444', '#3b82f6', '#14b8a6', '#f97316', '#84cc16', '#a855f7'
];

export const AdminSettings: React.FC = () => {
  const { 
    settings, updateSettings, 
    users, addUser, updateUser, deleteUser,
    artTypes, addArtType, updateArtType, deleteArtType, reorderArtTypes,
    currentUser
  } = useApp();
  
  const [activeTab, setActiveTab] = useState<'brand' | 'team' | 'artTypes' | 'security'>('brand');
  const [saving, setSaving] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [changingPassword, setChangingPassword] = useState(false);

  const [brandTitle, setBrandTitle] = useState(settings.brandTitle || '');
  const [loginSubtitle, setLoginSubtitle] = useState(settings.loginSubtitle || '');
  const [variationPoints, setVariationPoints] = useState(settings.variationPoints || 5);
  const [logoUrl, setLogoUrl] = useState(settings.logoUrl || '');

  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [userName, setUserName] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userColor, setUserColor] = useState(PRESET_COLORS[0]);

  const [showArtModal, setShowArtModal] = useState(false);
  const [editingArt, setEditingArt] = useState<any>(null);
  const [artLabel, setArtLabel] = useState('');
  const [artPoints, setArtPoints] = useState(10);

  const designers = users.filter(u => u.role === 'DESIGNER');

  const handleSaveBrand = async () => {
    setSaving(true);
    await updateSettings({ brandTitle, loginSubtitle, variationPoints, logoUrl });
    setSaving(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setLogoUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUser = async () => {
    if (!userName) return;

    if (editingUser) {
      await updateUser(editingUser.id, { 
        name: userName, 
        password: userPassword || undefined,
        avatarColor: userColor 
      });
    } else {
      await addUser({ 
        name: userName, 
        password: userPassword || '123',
        role: 'DESIGNER',
        avatarColor: userColor,
        active: true
      });
    }

    setShowUserModal(false);
    resetUserForm();
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    setUserName(user.name);
    setUserPassword('');
    setUserColor(user.avatarColor || PRESET_COLORS[0]);
    setShowUserModal(true);
  };

  const handleDeleteUser = async (id: string) => {
    if (confirm('Tem certeza que deseja desativar este designer?')) {
      await deleteUser(id);
    }
  };

  const resetUserForm = () => {
    setEditingUser(null);
    setUserName('');
    setUserPassword('');
    setUserColor(PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)]);
  };

  const handleSaveArt = async () => {
    if (!artLabel || artPoints <= 0) return;

    if (editingArt) {
      await updateArtType(editingArt.id, { label: artLabel, points: artPoints });
    } else {
      await addArtType({ label: artLabel, points: artPoints });
    }

    setShowArtModal(false);
    resetArtForm();
  };

  const handleEditArt = (art: any) => {
    setEditingArt(art);
    setArtLabel(art.label);
    setArtPoints(art.points);
    setShowArtModal(true);
  };

  const handleDeleteArt = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este tipo de arte?')) {
      await deleteArtType(id);
    }
  };

  const resetArtForm = () => {
    setEditingArt(null);
    setArtLabel('');
    setArtPoints(10);
  };

  const handleChangePassword = async () => {
    setPasswordMessage(null);
    
    if (!oldPassword || !newPassword) {
      setPasswordMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'As senhas não conferem' });
      return;
    }
    
    if (newPassword.length < 4) {
      setPasswordMessage({ type: 'error', text: 'A nova senha deve ter pelo menos 4 caracteres' });
      return;
    }
    
    setChangingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser?.id,
          oldPassword,
          newPassword
        })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setPasswordMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPasswordMessage({ type: 'error', text: data.error || 'Erro ao alterar senha' });
      }
    } catch (error) {
      setPasswordMessage({ type: 'error', text: 'Erro ao conectar com o servidor' });
    } finally {
      setChangingPassword(false);
    }
  };

  const tabs = [
    { id: 'brand', label: 'Marca', icon: Image },
    { id: 'team', label: 'Equipe', icon: Users },
    { id: 'artTypes', label: 'Tipos de Arte', icon: Palette },
    { id: 'security', label: 'Segurança', icon: Lock },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Personalize o sistema
        </p>
      </div>

      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-brand-600 text-brand-600'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'brand' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Logo
            </label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-contain" />
                ) : (
                  <Image className="text-slate-400" size={32} />
                )}
              </div>
              <div>
                <label className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                  Escolher arquivo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
                {logoUrl && (
                  <button 
                    onClick={() => setLogoUrl('')}
                    className="ml-2 text-red-500 text-sm"
                  >
                    Remover
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Nome do Sistema
            </label>
            <input
              type="text"
              value={brandTitle}
              onChange={(e) => setBrandTitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              placeholder="DesignFlow Pro"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subtítulo da Tela de Login
            </label>
            <input
              type="text"
              value={loginSubtitle}
              onChange={(e) => setLoginSubtitle(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
              placeholder="Sistema de Produtividade"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Pontos por Variação
            </label>
            <input
              type="number"
              min="1"
              value={variationPoints}
              onChange={(e) => setVariationPoints(parseInt(e.target.value) || 5)}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>

          <button
            onClick={handleSaveBrand}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
          >
            <Save size={20} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { resetUserForm(); setShowUserModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Novo Designer
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            {designers.map(user => (
              <div key={user.id} className={`p-4 flex items-center justify-between ${!user.active ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-3">
                  <div 
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ backgroundColor: user.avatarColor || '#4F46E5' }}
                  >
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{user.name}</p>
                    <p className="text-sm text-slate-500">{user.active ? 'Ativo' : 'Inativo'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  {user.active && (
                    <button
                      onClick={() => handleDeleteUser(user.id)}
                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'artTypes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => { resetArtForm(); setShowArtModal(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition-colors"
            >
              <Plus size={20} />
              Novo Tipo
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            {artTypes.sort((a, b) => a.order - b.order).map(art => (
              <div key={art.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="text-slate-300 cursor-grab" size={20} />
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{art.label}</p>
                    <p className="text-sm text-brand-600 font-semibold">{art.points} pontos</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEditArt(art)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteArt(art.id)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'security' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 max-w-md">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Alterar Senha
            </h3>
            
            {passwordMessage && (
              <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${
                passwordMessage.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400'
              }`}>
                {passwordMessage.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                <span className="text-sm">{passwordMessage.text}</span>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Senha Atual
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Nova Senha
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Confirmar Nova Senha
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="••••••••"
                />
              </div>
              
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !oldPassword || !newPassword || !confirmPassword || !currentUser}
                className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                <Lock size={20} />
                {changingPassword ? 'Alterando...' : 'Alterar Senha'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingUser ? 'Editar Designer' : 'Novo Designer'}
              </h2>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="Designer 04 - Nome"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  {editingUser ? 'Nova Senha (deixe vazio para manter)' : 'Senha'}
                </label>
                <input
                  type="password"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setUserColor(color)}
                      className={`w-10 h-10 rounded-full transition-transform ${
                        userColor === color ? 'ring-2 ring-offset-2 ring-brand-600 scale-110' : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSaveUser}
                disabled={!userName}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {editingUser ? 'Salvar Alterações' : 'Adicionar Designer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showArtModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                {editingArt ? 'Editar Tipo de Arte' : 'Novo Tipo de Arte'}
              </h2>
              <button onClick={() => setShowArtModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Nome</label>
                <input
                  type="text"
                  value={artLabel}
                  onChange={(e) => setArtLabel(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                  placeholder="Ex: Banner Animado"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Pontos</label>
                <input
                  type="number"
                  min="1"
                  value={artPoints}
                  onChange={(e) => setArtPoints(parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSaveArt}
                disabled={!artLabel || artPoints <= 0}
                className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-lg disabled:opacity-50 transition-colors"
              >
                {editingArt ? 'Salvar Alterações' : 'Adicionar Tipo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
