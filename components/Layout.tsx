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
  Moon
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { currentUser, logout, settings, theme, toggleTheme, feedbacks } = useApp();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isAdmin = currentUser?.role === 'ADM';
  
  const unviewedFeedbackCount = feedbacks.filter(
    f => f.designerId === currentUser?.id && !f.viewed
  ).length;

  const designerLinks = [
    { to: '/designer', icon: LayoutDashboard, label: 'Dashboard', badge: 0 },
    { to: '/designer/feedbacks', icon: MessageSquare, label: 'Feedbacks', badge: unviewedFeedbackCount },
    { to: '/designer/lessons', icon: GraduationCap, label: 'Aulas', badge: 0 },
  ];

  const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', badge: 0 },
    { to: '/admin/history', icon: History, label: 'Histórico', badge: 0 },
    { to: '/admin/feedbacks', icon: MessageSquare, label: 'Feedbacks', badge: 0 },
    { to: '/admin/lessons', icon: GraduationCap, label: 'Aulas', badge: 0 },
    { to: '/admin/settings', icon: Settings, label: 'Configurações', badge: 0 },
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
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h1 className="text-xl font-bold text-brand-600 dark:text-brand-400">
              {settings.brandTitle || 'DesignFlow Pro'}
            </h1>
          </div>

          <nav className="flex-1 p-4 space-y-2">
            {links.map(link => {
              const isActive = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-brand-600 text-white' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}
                  `}
                >
                  <link.icon size={20} />
                  <span className="font-medium flex-1">{link.label}</span>
                  {link.badge > 0 && (
                    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                      isActive 
                        ? 'bg-white text-brand-600' 
                        : 'bg-red-500 text-white'
                    }`}>
                      {link.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-semibold"
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
              className="w-full flex items-center gap-3 px-4 py-2 mb-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
              <span className="font-medium">{theme === 'dark' ? 'Tema Claro' : 'Tema Escuro'}</span>
            </button>

            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sair</span>
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

      <main className="flex-1 p-4 lg:p-8 overflow-auto">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
