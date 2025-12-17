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
  Funnel,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { NotificationBadge } from './notifications/NotificationBadge';
import { useNotification } from '../hooks/useNotification';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, settings, theme, toggleTheme, feedbacks } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  
  // Buscar notificação apenas para designers
  const { notification } = useNotification(currentUser?.role === 'DESIGNER' ? currentUser?.id : undefined);
  
  // Estado para sidebar colapsada (apenas desktop)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarCollapsed');
      return saved === 'true';
    }
    return false;
  });

  // Atualizar título da página dinamicamente
  React.useEffect(() => {
    if (settings?.brandTitle) {
      document.title = settings.brandTitle;
    } else {
      document.title = 'DesignFlow Pro';
    }
  }, [settings?.brandTitle]);

  // Persistir estado de colapsado no localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(sidebarCollapsed));
    }
  }, [sidebarCollapsed]);

  // AutoFocus quando sidebar expandir
  React.useEffect(() => {
    if (!sidebarCollapsed) {
      // Aguardar animação de expansão completar
      setTimeout(() => {
        import('../utils/autoFocus').then(({ autoFocus }) => {
          autoFocus(document.querySelector('aside'), 200);
        }).catch(console.error);
      }, 300);
    }
  }, [sidebarCollapsed]);

  const toggleSidebarCollapse = () => {
    setSidebarCollapsed(prev => !prev);
  };

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
        fixed lg:fixed inset-y-0 left-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 
        transform transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        ${sidebarCollapsed ? 'lg:w-20' : 'lg:w-64'} w-64
        flex flex-col h-screen overflow-hidden
      `}>
        <div className="flex flex-col h-full min-h-0 relative">
          <div className="flex-shrink-0 p-4 border-b border-slate-200 dark:border-slate-800">
            <div className={`flex items-center ${sidebarCollapsed ? 'lg:justify-center' : 'justify-between'}`}>
              {sidebarCollapsed ? (
                <div className="flex items-center justify-center w-full">
                  {settings.logoUrl ? (
                    <img 
                      src={settings.logoUrl} 
                      alt={settings.brandTitle || 'Logo'} 
                      className="h-9 w-9 object-contain flex-shrink-0 rounded-lg"
                    />
                  ) : (
                    <Funnel className="flex-shrink-0" size={20} style={{ color: '#280FFF' }} />
                  )}
                </div>
              ) : (
                <>
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
                  <button
                    onClick={toggleSidebarCollapse}
                    className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex-shrink-0"
                    title="Colapsar sidebar"
                  >
                    <ChevronLeft size={18} />
                  </button>
                </>
              )}
            </div>
          </div>

          <nav className="flex-1 min-h-0 p-3 space-y-1.5 overflow-y-auto overflow-x-hidden pb-24">
            {links.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center rounded-xl transition-all duration-200
                    ${sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'} py-2.5
                    ${isActive 
                      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/20' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200'}
                  `}
                  title={sidebarCollapsed ? link.label : undefined}
                >
                  <div className="relative flex items-center justify-center flex-shrink-0">
                    <link.icon size={20} />
                    {link.badge > 0 && (
                      <span className={`absolute -top-1 -right-1 px-1.5 py-0.5 min-w-[18px] text-xs font-semibold rounded-full flex items-center justify-center ${
                        isActive 
                          ? 'bg-white text-brand-600 dark:bg-slate-800 dark:text-white' 
                          : 'bg-red-500 text-white'
                      }`}>
                        {link.badge}
                      </span>
                    )}
                    {link.hasUpdate && link.badge === 0 && (
                      <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ${
                        isActive 
                          ? 'bg-white' 
                          : 'bg-red-500'
                      }`} />
                    )}
                  </div>
                  {!sidebarCollapsed && (
                    <>
                      <span className="font-medium flex-1">
                        {link.label}
                      </span>
                    </>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 p-4 space-y-2">
            {sidebarCollapsed && (
              <button
                onClick={toggleSidebarCollapse}
                className="w-full hidden lg:flex items-center justify-center h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors mb-2"
                title="Expandir sidebar"
              >
                <ChevronRight size={18} />
              </button>
            )}

            {!sidebarCollapsed && (
              <div className="flex items-center gap-3 px-1 py-2">
                <div 
                  className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0"
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
            )}
            
            {sidebarCollapsed && (
              <div className="flex items-center justify-center px-1 py-2">
                <div 
                  className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold text-sm shadow-sm flex-shrink-0"
                  style={{ backgroundColor: currentUser?.avatarColor }}
                >
                  {currentUser?.name?.charAt(0).toUpperCase()}
                </div>
              </div>
            )}
            
            <button
              onClick={toggleTheme}
              className={`w-full flex items-center rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-slate-200 ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'
              } py-2.5`}
              title={sidebarCollapsed ? (theme === 'dark' ? 'Tema Claro' : 'Tema Escuro') : undefined}
            >
              {theme === 'dark' ? <Sun size={18} className="flex-shrink-0" /> : <Moon size={18} className="flex-shrink-0" />}
              {!sidebarCollapsed && (
                <span className="font-medium text-sm">
                  {theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}
                </span>
              )}
            </button>

            <button
              onClick={handleLogout}
              className={`w-full flex items-center rounded-xl transition-all duration-200 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 ${
                sidebarCollapsed ? 'lg:justify-center lg:px-0' : 'gap-3 px-3.5'
              } py-2.5`}
              title={sidebarCollapsed ? 'Sair' : undefined}
            >
              <LogOut size={18} className="flex-shrink-0" />
              {!sidebarCollapsed && (
                <span className="font-medium text-sm">
                  Sair
                </span>
              )}
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

      <main className={`flex-1 p-4 lg:p-6 xl:p-8 overflow-auto bg-slate-50 dark:bg-slate-950 transition-all duration-300 ${
        sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'
      }`}>
        <div className="max-w-7xl mx-auto relative">
          {/* Notification Badge - Lado direito do layout (apenas para designers) */}
          {!isAdmin && notification && (
            <div className="absolute top-0 right-0 z-10">
              <NotificationBadge notification={notification} />
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
};
