import React from 'react';
import { useApp } from '../context/AppContext';
import { Link2, ExternalLink, Globe, Search } from 'lucide-react';

export const DesignerLinks: React.FC = () => {
  const { usefulLinks } = useApp();
  const [searchTerm, setSearchTerm] = React.useState('');

  const filteredLinks = usefulLinks.filter(link =>
    link.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    link.url.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDomain = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.hostname.replace('www.', '');
    } catch {
      return urlString;
    }
  };

  const handleOpenLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Links Uteis</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Acesse ferramentas e recursos importantes
          </p>
        </div>

        {/* Barra de busca */}
        {usefulLinks.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar link..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white w-full md:w-64"
            />
          </div>
        )}
      </div>

      {/* Estatistica */}
      <div className="bg-gradient-to-br from-indigo-50 to-blue-100 dark:from-indigo-900/20 dark:to-blue-800/20 rounded-2xl p-5 border border-indigo-200 dark:border-indigo-800">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-200 dark:bg-indigo-800 rounded-xl">
            <Globe className="text-indigo-600 dark:text-indigo-400" size={24} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{usefulLinks.length}</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">Links disponiveis</p>
          </div>
        </div>
      </div>

      {/* Lista de links */}
      {usefulLinks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Link2 className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhum link disponivel
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Em breve novos links serao adicionados
          </p>
        </div>
      ) : filteredLinks.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Search className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhum resultado encontrado
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Tente buscar por outro termo
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredLinks.map(link => (
            <div
              key={link.id}
              onClick={() => handleOpenLink(link.url)}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden cursor-pointer group hover:shadow-xl hover:border-indigo-300 dark:hover:border-indigo-700 hover:-translate-y-1 transition-all duration-300"
            >
              {link.imageUrl ? (
                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                  <img 
                    src={link.imageUrl} 
                    alt={link.title} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-3 right-3 p-2 bg-white/90 dark:bg-slate-900/90 rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <ExternalLink className="text-indigo-600 dark:text-indigo-400" size={18} />
                  </div>
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-indigo-400 via-indigo-500 to-blue-600 flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.2),transparent_50%)]" />
                  <Globe className="text-white/30 group-hover:scale-110 transition-transform duration-500" size={80} />
                  <div className="absolute bottom-3 right-3 p-2 bg-white/20 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                    <ExternalLink className="text-white" size={18} />
                  </div>
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {link.title}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate">
                  <Link2 size={14} className="flex-shrink-0" />
                  <span className="truncate">{getDomain(link.url)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dica */}
      {usefulLinks.length > 0 && (
        <div className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <ExternalLink size={16} />
          <span>Clique em um card para abrir o link em uma nova aba</span>
        </div>
      )}
    </div>
  );
};
