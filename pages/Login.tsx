import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { User, Shield, Lock, AlertCircle, Sun, Moon } from 'lucide-react';

type RoleTab = 'DESIGNER' | 'ADM';

export const Login: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<RoleTab>('DESIGNER');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, currentUser, settings, users, theme, toggleTheme } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate(currentUser.role === 'ADM' ? '/admin' : '/designer');
    }
  }, [currentUser, navigate]);

  const filteredUsers = users.filter(u => u.active && u.role === selectedRole);

  const selectedUser = users.find(u => u.id === selectedUserId);

  const adminUser = users.find(u => u.active && u.role === 'ADM');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (selectedRole === 'ADM') {
      if (!adminUser) {
        setError('Nenhum administrador cadastrado');
        return;
      }
      setLoading(true);
      const success = await login(adminUser.name, password);
      setLoading(false);
      if (!success) {
        setError('Senha incorreta');
      }
      return;
    }

    if (!selectedUser) {
      setError('Selecione um perfil');
      return;
    }

    setLoading(true);
    const success = await login(selectedUser.name, password);
    setLoading(false);
    
    if (!success) {
      setError('Senha incorreta');
    }
  };

  const getAvatarBg = (user: typeof selectedUser) => {
    if (user?.avatarColor) return user.avatarColor;
    const avatarUrl = user?.avatarUrl || '';
    const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
    if (bgMatch) return `#${bgMatch[1]}`;
    return '#4F46E5';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      const firstName = parts[0];
      const lastName = parts[parts.length - 1];
      return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4 relative">
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg hover:shadow-xl transition-all text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
        title={theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
      >
        {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-8 border border-slate-200 dark:border-slate-800">
          <div className="text-center mb-8">
            {settings.logoUrl ? (
              <img src={settings.logoUrl} alt="Logo" className="h-20 mx-auto mb-4" />
            ) : (
              <div className="flex justify-center mb-4">
                <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M40 10L60 70H50L40 35L30 70H20L40 10Z" stroke="#1e293b" strokeWidth="3" fill="none"/>
                  <path d="M25 55H55" stroke="#4F46E5" strokeWidth="3"/>
                  <circle cx="40" cy="15" r="3" fill="#4F46E5"/>
                </svg>
              </div>
            )}
            <h1 className="text-2xl font-bold">
              <span className="text-slate-900 dark:text-white">PLUS</span>
              <span className="text-brand-600">MIDIA</span>
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Faca login para continuar
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-full p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setSelectedRole('DESIGNER');
                setSelectedUserId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'DESIGNER'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <User size={18} />
              Designer
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedRole('ADM');
                setSelectedUserId('');
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-full text-sm font-medium transition-all ${
                selectedRole === 'ADM'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              <Shield size={18} />
              Administrador
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl">
                <AlertCircle size={20} />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {selectedRole === 'DESIGNER' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Selecione seu perfil
                </label>
                <div className="relative">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all appearance-none text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Selecione um perfil</option>
                    {filteredUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.name}</option>
                    ))}
                  </select>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    {selectedUser ? (
                      <div 
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                        style={{ backgroundColor: getAvatarBg(selectedUser) }}
                      >
                        {getInitials(selectedUser.name)}
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <User size={16} className="text-slate-400" />
                      </div>
                    )}
                  </div>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}

            {selectedRole === 'ADM' && adminUser && (
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Perfil selecionado
                </label>
                <div className="relative">
                  <div className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white">
                    {adminUser.name}
                  </div>
                  <div className="absolute left-3 top-1/2 -translate-y-1/2">
                    <div 
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: getAvatarBg(adminUser) }}
                    >
                      {getInitials(adminUser.name)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-4 py-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (selectedRole === 'DESIGNER' && !selectedUserId)}
              className="w-full py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/30"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
