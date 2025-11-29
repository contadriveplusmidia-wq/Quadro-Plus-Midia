import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, Crown, Star, Calendar, Sparkles, Award, TrendingUp, MessageSquare } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell, CartesianGrid } from 'recharts';

// Componente de Tooltip customizado com tema
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color?: string; payload?: { color: string } }>;
  label?: string;
  isDark: boolean;
  formatter?: (value: number, name: string) => [number | string, string];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, isDark, formatter }) => {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className={`
        px-3 py-2.5 rounded-md shadow-lg transition-all duration-150
        ${isDark 
          ? 'bg-gray-800/95 border border-gray-600/50' 
          : 'bg-white/95 border border-gray-200'
        }
      `}
    >
      <p className={`text-xs font-semibold mb-1.5 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
        {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry, index) => {
          const [formattedValue, formattedName] = formatter 
            ? formatter(entry.value, entry.name) 
            : [entry.value, entry.name];
          const color = entry.color || entry.payload?.color || '#3B82F6';
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: color }}
              />
              <span className={isDark ? 'text-gray-300' : 'text-gray-600'}>
                {formattedName}:
              </span>
              <span className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const DesignerPremiacoes: React.FC = () => {
  const { currentUser, awards, users, settings, demands, resetAwardsUpdates } = useApp();
  const [isDark, setIsDark] = useState(false);

  // Resetar flag de atualizações quando a página for acessada
  useEffect(() => {
    if (settings?.awardsHasUpdates === true) {
      resetAwardsUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez quando o componente montar

  // Detectar tema claro/escuro
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  // Cores do grid baseadas no tema
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

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

  // Função para obter cor do designer (mesma lógica da Dashboard)
  const getDesignerColorForChart = (designerId: string): string => {
    const designer = users.find(u => u.id === designerId);
    if (designer?.avatarColor) return designer.avatarColor;
    const avatarUrl = designer?.avatarUrl || '';
    const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
    if (bgMatch) return `#${bgMatch[1]}`;
    const colors = ['#4F46E5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    const designers = users.filter(u => u.role === 'DESIGNER' && u.active);
    const index = designers.findIndex(d => d.id === designerId);
    return colors[index % colors.length];
  };

  // Dados do gráfico usando a mesma lógica da Dashboard (mês atual)
  const chartData = useMemo(() => {
    if (!settings.showAwardsChart) return [];

    // Filtrar apenas o mês atual (mesma lógica da Dashboard)
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();

    // Filtrar demandas do mês atual
    const filteredDemands = demands.filter(d => 
      d.timestamp >= currentMonthStart && 
      d.timestamp <= currentMonthEnd
    );

    // Obter designers ativos
    const activeDesigners = users.filter(u => u.role === 'DESIGNER' && u.active);

    // Agrupar por designer (mesma lógica da Dashboard)
    return activeDesigners.map(designer => {
      const designerDemands = filteredDemands.filter(d => d.userId === designer.id);
      const points = designerDemands.reduce((acc, d) => acc + d.totalPoints, 0);
      
      return {
        name: designer.name.split(' - ')[1] || designer.name,
        pontos: points,
        color: getDesignerColorForChart(designer.id)
      };
    }).filter(d => d.pontos > 0).sort((a, b) => b.pontos - a.pontos); // Ordenar por pontos (maior para menor)
  }, [users, demands, settings.showAwardsChart]);

  // Próxima premiação (imagem grande configurada pelo admin)
  const nextAwardImage = settings.nextAwardImage;
  const motivationalMessage = settings.motivationalMessage;
  const motivationalMessageEnabled = settings.motivationalMessageEnabled;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Premiações</h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Confira os vencedores mensais
        </p>
      </div>

      {/* Mensagem Motivacional */}
      {motivationalMessageEnabled && motivationalMessage && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-200 dark:bg-amber-800 rounded-lg flex-shrink-0">
              <MessageSquare className="text-amber-600 dark:text-amber-400" size={20} />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-medium">
              {motivationalMessage}
            </p>
          </div>
        </div>
      )}

      {/* Card especial se o designer tem trofeu */}
      {myAwards.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/20 rounded-lg">
              <Crown className="text-amber-600 dark:text-amber-400" size={18} />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Parabéns!
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">
                você é um dos nossos melhores Designers
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <Trophy size={16} />
              <span className="text-sm font-medium">{myAwards.length} {myAwards.length === 1 ? 'Troféu' : 'Troféus'}</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-amber-200/50 dark:border-amber-800/20">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Última premiação: <span className="text-slate-600 dark:text-slate-300">{myAwards[0]?.month || ''}</span>
            </p>
          </div>
        </div>
      )}

      {/* Layout duas colunas: Imagem grande da próxima premiação + Informações */}
      {nextAwardImage && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="grid md:grid-cols-2 gap-0">
            {/* Coluna Esquerda: Imagem Grande */}
            <div className="bg-slate-100 dark:bg-slate-800 flex items-center justify-center p-4 md:p-6 min-h-[300px] md:min-h-[400px]">
              <img 
                src={nextAwardImage} 
                alt="Próxima premiação" 
                className="w-full h-auto max-h-[400px] md:max-h-[500px] object-contain rounded-lg"
                style={{ maxWidth: '100%' }}
              />
            </div>

            {/* Coluna Direita: Informações */}
            <div className="p-4 md:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-500 mb-4">
                  <Sparkles size={20} />
                  <span className="text-sm font-medium">Próxima Premiação</span>
                </div>
                
                {latestAward && (
                  <>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      Vencedor de {latestAward.month}
                    </h3>
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: getDesignerColor(latestAward.designerId) }}
                      >
                        {getDesignerInitials(latestAward.designerName)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {latestAward.designerName.split(' - ')[1] || latestAward.designerName}
                        </p>
                        {latestAward.description && (
                          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                            {latestAward.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {/* Gráfico de Pontos do Mês Atual (mesma lógica da Dashboard) */}
                {settings.showAwardsChart && (
                  <div className="mt-6">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="text-[#280FFF] dark:text-slate-300" size={18} />
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                        Pontos do Mês Atual
                      </h4>
                    </div>
                    {chartData.length > 0 ? (
                      <div className="h-40">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} barCategoryGap="20%">
                            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              tick={{ fill: tickColor, fontSize: 11 }} 
                              axisLine={{ stroke: gridColor }}
                              tickLine={false}
                              angle={-30}
                              textAnchor="end"
                              height={70}
                              interval={0}
                            />
                            <YAxis 
                              tick={{ fill: tickColor, fontSize: 12 }} 
                              axisLine={false}
                              tickLine={false}
                            />
                            <Tooltip 
                              content={
                                <CustomTooltip 
                                  isDark={isDark} 
                                  formatter={(value) => [value, 'Pontos']}
                                />
                              }
                              cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                            />
                            <Bar 
                              dataKey="pontos" 
                              radius={[6, 6, 0, 0]}
                              maxBarSize={80}
                              style={{ transition: 'opacity 150ms ease' }}
                            >
                              {chartData.map((entry, index) => (
                                <Cell 
                                  key={`cell-${index}`} 
                                  fill={entry.color}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-32 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-lg">
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Sem dados para o período selecionado
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Destaque do vencedor mais recente (se não houver imagem grande) */}
      {!nextAwardImage && latestAward && (
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

      {/* Ranking e Histórico */}
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

        {/* Histórico de vencedores */}
        <div className={`${ranking.length > 0 ? 'md:col-span-2' : 'md:col-span-3'} bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5`}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="text-slate-400" size={20} />
            <h3 className="font-semibold text-slate-900 dark:text-white">Histórico de Vencedores</h3>
          </div>
          
          {awards.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={40} />
              <p className="text-slate-500 dark:text-slate-400">
                Nenhuma premiação registrada ainda
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
                          Você
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
