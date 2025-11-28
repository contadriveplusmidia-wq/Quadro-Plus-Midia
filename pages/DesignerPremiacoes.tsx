import React, { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Crown, Star, Calendar, Sparkles, Award } from 'lucide-react';

export const DesignerPremiacoes: React.FC = () => {
  const { currentUser, awards, users } = useApp();

  const getDesignerColor = (designerId: string) => {
    const designer = users.find(u => u.id === designerId);
    return designer?.avatarColor || '#4F46E5';
  };

  const getDesignerInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const myAwards = useMemo(() => {
    if (!currentUser) return [];
    return awards.filter(a => a.designerId === currentUser.id);
  }, [awards, currentUser]);

  const latestAward = useMemo(() => {
    if (awards.length === 0) return null;
    return awards[0]; // Já vem ordenado por createdAt DESC da API
  }, [awards]);

  const ranking = useMemo(() => {
    const counts: Record<string, { name: string, count: number, color: string }> = {};
    awards.forEach(a => {
      if (!counts[a.designerId]) {
        counts[a.designerId] = {
          name: a.designerName,
          count: 0,
          color: getDesignerColor(a.designerId)
        };
      }
      counts[a.designerId].count++;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5);
  }, [awards, users]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Premiacoes</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Confira os vencedores mensais
        </p>
      </div>

      {/* Card especial se o designer tem trofeu */}
      {myAwards.length > 0 && (
        <div className="relative overflow-hidden bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 rounded-2xl p-6 text-white">
          <div className="absolute top-0 right-0 opacity-10">
            <Trophy size={200} />
          </div>
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <Crown className="text-white" size={28} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Parabens!</h2>
                <p className="text-white/80">Voce e um vencedor!</p>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4">
              <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                <Trophy size={20} />
                <span className="font-semibold">{myAwards.length} {myAwards.length === 1 ? 'Trofeu' : 'Trofeus'}</span>
              </div>
              <div className="flex -space-x-1">
                {myAwards.slice(0, 3).map((a) => (
                  <div 
                    key={a.id}
                    className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-sm"
                    title={a.month}
                  >
                    <Star size={14} className="text-white" />
                  </div>
                ))}
                {myAwards.length > 3 && (
                  <div className="w-8 h-8 bg-white/30 rounded-full flex items-center justify-center border-2 border-white/50 backdrop-blur-sm text-xs font-semibold">
                    +{myAwards.length - 3}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-white/80">
                Ultima premiacao: <span className="text-white font-medium">{myAwards[0]?.month || ''}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Destaque da premiacao atual/mais recente */}
      {latestAward && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {latestAward.imageUrl ? (
            <div className="relative h-64 bg-slate-100 dark:bg-slate-800">
              <img 
                src={latestAward.imageUrl} 
                alt={latestAward.description} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 text-amber-400 mb-2">
                  <Sparkles size={20} />
                  <span className="text-sm font-medium">Vencedor de {latestAward.month}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-4 border-white/30"
                    style={{ backgroundColor: getDesignerColor(latestAward.designerId) }}
                  >
                    {getDesignerInitials(latestAward.designerName)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {latestAward.designerName.split(' - ')[1] || latestAward.designerName}
                    </h3>
                    {latestAward.description && (
                      <p className="text-white/80 text-sm mt-1">{latestAward.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative h-64 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center">
              <Trophy className="absolute text-white/10" size={200} />
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex items-center gap-2 text-white mb-2">
                  <Sparkles size={20} />
                  <span className="text-sm font-medium">Vencedor de {latestAward.month}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div
                    className="w-14 h-14 rounded-full flex items-center justify-center text-white font-bold text-lg border-4 border-white/30"
                    style={{ backgroundColor: getDesignerColor(latestAward.designerId) }}
                  >
                    {getDesignerInitials(latestAward.designerName)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">
                      {latestAward.designerName.split(' - ')[1] || latestAward.designerName}
                    </h3>
                    {latestAward.description && (
                      <p className="text-white/90 text-sm mt-1">{latestAward.description}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        {/* Ranking */}
        {ranking.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Award className="text-amber-500" size={20} />
              <h3 className="font-semibold text-slate-900 dark:text-white">Top Vencedores</h3>
            </div>
            <div className="space-y-3">
              {ranking.map(([designerId, data], index) => (
                <div key={designerId} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    index === 0 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
                    index === 1 ? 'bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300' :
                    index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                  }`}>
                    {index + 1}
                  </div>
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                    style={{ backgroundColor: data.color }}
                  >
                    {getDesignerInitials(data.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                      {data.name.split(' - ')[1] || data.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-500">
                    <Trophy size={14} />
                    <span className="text-sm font-semibold">{data.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lista de vencedores anteriores */}
        <div className={`${ranking.length > 0 ? 'md:col-span-2' : 'md:col-span-3'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Historico de Vencedores</h3>
          </div>
          
          {awards.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
              <p className="text-slate-500 dark:text-slate-400">
                Nenhuma premiacao registrada ainda
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
              {awards.map((award) => (
                <div 
                  key={award.id}
                  className={`flex items-center gap-4 p-3 rounded-xl transition-colors ${
                    award.designerId === currentUser?.id 
                      ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  {award.imageUrl ? (
                    <img 
                      src={award.imageUrl} 
                      alt=""
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center">
                      <Trophy className="text-white" size={20} />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900 dark:text-white truncate">
                        {award.designerName.split(' - ')[1] || award.designerName}
                      </p>
                      {award.designerId === currentUser?.id && (
                        <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full">
                          Voce
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {award.month}
                    </p>
                  </div>
                  
                  <Trophy className="text-amber-500" size={18} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
