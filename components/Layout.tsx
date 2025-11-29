import React from 'react';
import { useApp } from '../context/AppContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  MessageSquare, 
  GraduationCap, 
  History, 
  Settings, 
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Trophy,
  Link2,
  Funnel
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, settings, theme, toggleTheme, feedbacks } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  // Atualizar título da página dinamicamente
  React.useEffect(() => {
    if (settings?.brandTitle) {
      document.title = settings.brandTitle;
    } else {
      document.title = 'DesignFlow Pro';
    }
  }, [settings?.brandTitle]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'ADM';
  
  const unviewedFeedbackCount = feedbacks.filter(
    f => f.designerId === currentUser?.id && !f.viewed
  ).length;

  const awardsHasUpdates = settings?.awardsHasUpdates === true;

  const designerLinks = [
    { to: '/designer', icon: LayoutDashboard, label: 'Dashboard', badge: 0, hasUpdate: false },
    { to: '/designer/feedbacks', icon: MessageSquare, label: 'Feedbacks', badge: unviewedFeedbackCount, hasUpdate: false },
    { to: '/designer/lessons', icon: GraduationCap, label: 'Aulas', badge: 0, hasUpdate: false },
    { to: '/designer/premiacoes', icon: Trophy, label: 'Premiações', badge: 0, hasUpdate: awardsHasUpdates },
    { to: '/designer/links', icon: Link2, label: 'Links Úteis', badge: 0, hasUpdate: false },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: 0, hasUpdate: false },
    { to: '/admin/history', icon: History, label: 'Histórico', badge: 0, hasUpdate: false },
    { to: '/admin/feedbacks', icon: MessageSquare, label: 'Feedbacks', badge: 0, hasUpdate: false },
    { to: '/admin/lessons', icon: GraduationCap, label: 'Aulas', badge: 0, hasUpdate: false },
    { to: '/admin/premiacoes', icon: Trophy, label: 'Premiações', badge: 0, hasUpdate: awardsHasUpdates },
    { to: '/admin/links', icon: Link2, label: 'Links Úteis', badge: 0, hasUpdate: false },
    { to: '/admin/settings', icon: Settings, label: 'Configurações', badge: 0, hasUpdate: false },
  ];

  const links = isAdmin ? adminLinks : designerLinks;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex">
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="flex flex-col h-full">
          <div className="p-5 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              {settings.logoUrl ? (
                <img 
                  src={settings.logoUrl} 
                  alt={settings.brandTitle || 'Logo'} 
                  className="h-9 w-9 object-contain flex-shrink-0 rounded-lg"
                />
              ) : (
                <Funnel className="flex-shrink-0" size={20} style={{ color: '#280FFF' }} />
              )}
              <h1 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">
                {settings.brandTitle || 'DesignFlow Pro'}
              </h1>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {links.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                  `}
                >
                  <link.icon size={20} />
                  <span className="font-medium flex-1">{link.label}</span>
                  {link.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isActive 
                        ? 'bg-white text-brand-600 dark:bg-slate-800 dark:text-white' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                  {link.hasUpdate && link.badge === 0 && (
                    <span className={`w-2 h-2 rounded-full ${
                      isActive 
                        ? 'bg-white' 
                        : 'bg-red-500'
                    }`} />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
            <div className="flex items-center gap-3 px-1 py-2">
              <div 
                className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm"
                style={{ backgroundColor: currentUser?.avatarColor }}
              >
                {currentUser?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                  {currentUser?.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isAdmin ? 'Administrador' : 'Designer'}
                </p>
              </div>
            </div>
            
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 rounded-xl transition-all duration-200 hover:text-slate-900 dark:hover:text-slate-200"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              <span className="font-medium text-sm">{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all duration-200"
            >
              <LogOut size={18} />
              <span className="font-medium text-sm">Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="flex-1 p-4 lg:p-6 xl:p-8 overflow-auto bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
