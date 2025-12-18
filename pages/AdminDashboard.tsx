import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Filter, Award, Calendar, TrendingUp, BarChart3, Users, ChevronDown, RefreshCw, X, Circle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { DatePicker } from '../components/DatePicker';
import { HistoryCharts } from '../components/HistoryCharts';
import { DailyGoalChart } from '../components/DailyGoalChart';

type ChartMode = 'somaPoints' | 'somaArts' | 'mediaPoints' | 'mediaArts';
type DateFilterType = 'hoje' | 'semana' | 'semanaPassada' | 'mes' | 'custom';

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
          const numValue = Number(entry.value) || 0;
          const [formattedValue, formattedName] = formatter 
            ? formatter(numValue, entry.name) 
            : [numValue, entry.name];
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

export const AdminDashboard: React.FC = () => {
  const { users, demands, artTypes, refreshData, getTodaySession, settings } = useApp();
  const [selectedDesigner, setSelectedDesigner] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('hoje');
  const [chartMode, setChartMode] = useState<ChartMode>('somaArts');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  // Estado para forçar re-render e atualizar status periodicamente
  const [, setRefreshStatus] = useState(0);

  // Atualizar dados e status em tempo real a cada 15 segundos
  useEffect(() => {
    // Atualizar imediatamente ao montar
    refreshData();
    
    const interval = setInterval(() => {
      // Atualizar dados do servidor para ter status em tempo real
      refreshData();
      // Forçar re-render do status
      setRefreshStatus(prev => prev + 1);
    }, 15000); // 15 segundos para atualização mais frequente

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez ao montar

  // Função para verificar se um designer está online (em tempo real)
  const isDesignerOnline = useCallback((designerId: string): boolean => {
    try {
      // Verificar se tem sessão de trabalho hoje (após 6h)
      const todaySession = getTodaySession(designerId);
      if (!todaySession) {
        return false;
      }

      // Verificar se a sessão foi criada após 6h da manhã
      const sessionDate = new Date(todaySession.timestamp);
      const sessionHour = sessionDate.getHours();
      
      // Sessão criada antes das 6h não é válida
      if (sessionHour < 6) {
        return false;
      }

      // Verificar última atividade (última demanda após 6h)
      const today = new Date();
      today.setHours(6, 0, 0, 0);
      const todayStart = today.getTime();
      
      const lastDemand = demands
        .filter(d => {
          // Filtrar apenas demandas do usuário após 6h de hoje
          if (d.userId !== designerId) return false;
          if (d.timestamp < todayStart) return false;
          
          const demandDate = new Date(d.timestamp);
          const demandHour = demandDate.getHours();
          return demandHour >= 6;
        })
        .sort((a, b) => b.timestamp - a.timestamp)[0];

      const now = Date.now();
      const fifteenMinutesAgo = now - (15 * 60 * 1000); // Reduzido para 15 minutos para detecção mais rápida

      if (!lastDemand) {
        // Se tem sessão mas não tem demanda, considerar online se a sessão foi criada recentemente (últimos 15 min)
        // OU se a sessão foi criada hoje e ainda não passou muito tempo (até 2 horas sem atividade)
        const twoHoursAgo = now - (2 * 60 * 60 * 1000);
        const sessionIsRecent = todaySession.timestamp >= fifteenMinutesAgo;
        const sessionIsToday = todaySession.timestamp >= twoHoursAgo;
        
        // Se a sessão foi criada recentemente (15 min) OU foi criada hoje e ainda está dentro de 2h, considerar online
        return sessionIsRecent || (sessionIsToday && todaySession.timestamp >= todayStart);
      }

      // Considerar online se teve atividade nos últimos 15 minutos
      // Isso garante que quando alguém sair, o status mude rapidamente
      const hasRecentActivity = lastDemand.timestamp >= fifteenMinutesAgo;
      return hasRecentActivity;
    } catch (error) {
      console.error('Erro ao verificar status online:', error);
      return false;
    }
  }, [demands, getTodaySession]);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  const getDesignerColor = (designerId: string): string => {
    const designer = users.find(u => u.id === designerId);
    if (designer?.avatarColor) return designer.avatarColor;
    const avatarUrl = designer?.avatarUrl || '';
    const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
    if (bgMatch) return `#${bgMatch[1]}`;
    const colors = ['#4F46E5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    const index = designers.findIndex(d => d.id === designerId);
    return colors[index % colors.length];
  };

  const getDateRange = (): { start: number; end: number } => {
    // SEMPRE usar timezone local do Brasil (America/Sao_Paulo, UTC-3)
    // new Date() já retorna no timezone local do sistema
    const now = new Date();
    
    // Criar data de hoje normalizada para início do dia (00:00:00) no timezone local
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    today.setHours(0, 0, 0, 0);
    
    // Criar data de hoje normalizada para fim do dia (23:59:59.999) no timezone local
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    switch (dateFilter) {
      case 'hoje': {
        // FILTRO "HOJE": retorna exatamente o dia atual local
        // Exemplo: se hoje for 02/12/2025, retorna 02/12/2025 00:00:00 até 02/12/2025 23:59:59
        return { start: today.getTime(), end: todayEnd.getTime() };
      }
      case 'semana': {
        // FILTRO "SEMANA": calcula semana de DOMINGO a SÁBADO usando timezone local
        // getDay() retorna: 0=Domingo, 1=Segunda, 2=Terça, 3=Quarta, 4=Quinta, 5=Sexta, 6=Sábado
        const dayOfWeek = today.getDay();
        
        // Calcular quantos dias subtrair para chegar ao domingo da semana atual
        // Se hoje é domingo (0), não subtrai nada
        // Se hoje é segunda (1), subtrai 1 dia
        // Se hoje é sábado (6), subtrai 6 dias
        const daysToSubtract = dayOfWeek;
        
        // Início da semana = domingo (00:00:00)
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - daysToSubtract);
        weekStart.setHours(0, 0, 0, 0);
        
        // Fim da semana = sábado (23:59:59.999) - 6 dias após o domingo
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        
        return { start: weekStart.getTime(), end: weekEnd.getTime() };
      }
      case 'semanaPassada': {
        // FILTRO "SEMANA PASSADA": calcula semana passada de DOMINGO a SÁBADO usando timezone local
        const dayOfWeek = today.getDay();
        
        // Calcular quantos dias subtrair para chegar ao domingo da semana atual
        const daysToSubtract = dayOfWeek;
        
        // Início da semana atual = domingo (00:00:00)
        const currentWeekStart = new Date(today);
        currentWeekStart.setDate(currentWeekStart.getDate() - daysToSubtract);
        currentWeekStart.setHours(0, 0, 0, 0);
        
        // Início da semana passada = 7 dias antes do início da semana atual
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        lastWeekStart.setHours(0, 0, 0, 0);
        
        // Fim da semana passada = sábado (23:59:59.999) - 6 dias após o domingo da semana passada
        const lastWeekEnd = new Date(lastWeekStart);
        lastWeekEnd.setDate(lastWeekEnd.getDate() + 6);
        lastWeekEnd.setHours(23, 59, 59, 999);
        
        return { start: lastWeekStart.getTime(), end: lastWeekEnd.getTime() };
      }
      case 'mes': {
        // FILTRO "MÊS": primeiro e último dia do mês atual no timezone local
        // new Date(year, month, 1) = primeiro dia do mês
        // new Date(year, month + 1, 0) = último dia do mês (dia 0 do próximo mês = último dia do mês atual)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        monthStart.setHours(0, 0, 0, 0);
        
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        
        return { start: monthStart.getTime(), end: monthEnd.getTime() };
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          // Parse da string YYYY-MM-DD no timezone local
          const [startYear, startMonth, startDay] = customStartDate.split('-').map(Number);
          const start = new Date(startYear, startMonth - 1, startDay);
          start.setHours(0, 0, 0, 0);
          
          const [endYear, endMonth, endDay] = customEndDate.split('-').map(Number);
          const endDate = new Date(endYear, endMonth - 1, endDay);
          endDate.setHours(23, 59, 59, 999);
          
          // Se as datas são iguais, retornar apenas um dia
          if (customStartDate === customEndDate) {
            return { start: start.getTime(), end: endDate.getTime() };
          }
          
          return { start: start.getTime(), end: endDate.getTime() };
        }
        // Se apenas uma data foi selecionada, usar como início e fim
        if (customStartDate) {
          const [year, month, day] = customStartDate.split('-').map(Number);
          const start = new Date(year, month - 1, day);
          start.setHours(0, 0, 0, 0);
          const end = new Date(year, month - 1, day);
          end.setHours(23, 59, 59, 999);
          return { start: start.getTime(), end: end.getTime() };
        }
        if (customEndDate) {
          const [year, month, day] = customEndDate.split('-').map(Number);
          const start = new Date(year, month - 1, day);
          start.setHours(0, 0, 0, 0);
          const end = new Date(year, month - 1, day);
          end.setHours(23, 59, 59, 999);
          return { start: start.getTime(), end: end.getTime() };
        }
        return { start: today.getTime(), end: todayEnd.getTime() };
      }
      default:
        return { start: today.getTime(), end: todayEnd.getTime() };
    }
  };

  const getWorkingDaysInRange = (start: number, end: number): number => {
    let count = 0;
    const current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      const day = current.getDay();
      // Contar apenas dias úteis: Segunda (1) a Sábado (6), excluindo Domingo (0)
      if (day >= 1 && day <= 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count || 1;
  };

  const filteredDemands = useMemo(() => {
    const { start, end } = getDateRange();
    let filtered = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    // Se selectedDesigner está vazio ou é 'all', mostra todos. Caso contrário, filtra por designer específico
    if (selectedDesigner && selectedDesigner !== 'all') {
      filtered = filtered.filter(d => d.userId === selectedDesigner);
    }
    return filtered;
  }, [demands, selectedDesigner, dateFilter, customStartDate, customEndDate]);

  // Função para determinar a classificação baseada na meta semanal
  const getArtsPerformance = (totalArts: number, dailyGoal: number): 'ruim' | 'medio' | 'bom' => {
    if (!dailyGoal || dailyGoal <= 0) return 'medio'; // Se não houver meta, retorna médio
    
    const weeklyGoal = dailyGoal * 6; // Meta semanal (6 dias úteis)
    const percentage = (totalArts / weeklyGoal) * 100;
    
    if (percentage < 50) return 'ruim'; // Menos da metade
    if (percentage < 100) return 'medio'; // Metade até 99%
    return 'bom'; // 100% ou mais
  };

  // Função para determinar a classificação da média baseada na meta diária
  const getAvgArtsPerformance = (avgArts: number, dailyGoal: number): 'ruim' | 'medio' | 'bom' => {
    if (!dailyGoal || dailyGoal <= 0) return 'medio'; // Se não houver meta, retorna médio
    
    const percentage = (avgArts / dailyGoal) * 100;
    
    if (percentage < 50) return 'ruim'; // Menos da metade
    if (percentage < 100) return 'medio'; // Metade até 99%
    return 'bom'; // 100% ou mais
  };

  // Função para determinar a classificação da média geral do time (mais granular)
  const getTeamAvgArtsPerformance = (avgArts: number, teamDailyGoal: number): 'muitoBaixo' | 'mediano' | 'proximo' | 'dentro' => {
    if (!teamDailyGoal || teamDailyGoal <= 0) return 'mediano';
    
    const percentage = (avgArts / teamDailyGoal) * 100;
    
    if (percentage < 50) return 'muitoBaixo'; // Muito abaixo da meta (< 50%)
    if (percentage < 75) return 'mediano'; // Mediano (50% a 74%)
    if (percentage < 100) return 'proximo'; // Próximo da meta (75% a 99%)
    return 'dentro'; // Dentro ou acima da meta (≥ 100%)
  };

  // Função para obter a cor do texto baseado na performance
  const getPerformanceColor = (performance: 'ruim' | 'medio' | 'bom'): string => {
    switch (performance) {
      case 'ruim':
        return 'text-red-600 dark:text-red-400';
      case 'medio':
        return 'text-amber-600 dark:text-amber-400';
      case 'bom':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-slate-900 dark:text-white';
    }
  };

  // Função para obter a cor do texto baseado na performance do time (mais granular)
  const getTeamPerformanceColor = (performance: 'muitoBaixo' | 'mediano' | 'proximo' | 'dentro'): string => {
    switch (performance) {
      case 'muitoBaixo':
        return 'text-red-600 dark:text-red-400';
      case 'mediano':
        return 'text-amber-600 dark:text-amber-400';
      case 'proximo':
        return 'text-orange-600 dark:text-orange-400';
      case 'dentro':
        return 'text-green-600 dark:text-green-400';
      default:
        return 'text-slate-900 dark:text-white';
    }
  };

  const stats = useMemo(() => {
    // Garantir que os valores são números
    const totalPoints = filteredDemands.reduce((acc, d) => {
      const points = Number(d.totalPoints) || 0;
      return acc + points;
    }, 0);
    const totalArts = filteredDemands.reduce((acc, d) => {
      const quantity = Number(d.totalQuantity) || 0;
      return acc + quantity;
    }, 0);
    const totalDemands = filteredDemands.length;

    const designerPoints: Record<string, { id: string; name: string; points: number }> = {};
    filteredDemands.forEach(d => {
      if (!designerPoints[d.userId]) {
        const designer = designers.find(des => des.id === d.userId);
        designerPoints[d.userId] = { 
          id: d.userId,
          name: designer?.name.split(' - ')[1] || designer?.name || 'Designer',
          points: 0 
        };
      }
      const points = Number(d.totalPoints) || 0;
      designerPoints[d.userId].points += points;
    });

    let topPerformer = { id: '', name: '-', points: 0 };
    Object.values(designerPoints).forEach(dp => {
      if (dp.points > topPerformer.points) {
        topPerformer = dp;
      }
    });

    // Calcular média de artes quando um designer estiver selecionado
    let avgArts = 0;
    if (selectedDesigner && selectedDesigner !== 'all') {
      const { start, end } = getDateRange();
      const workingDays = getWorkingDaysInRange(start, end);
      avgArts = workingDays > 0 ? Math.round((totalArts / workingDays) * 10) / 10 : 0;
    }

    // Calcular média geral de artes quando "Todos os Designers" estiver selecionado
    let teamAvgArts = 0;
    if (selectedDesigner === 'all' || !selectedDesigner) {
      const { start, end } = getDateRange();
      const workingDays = getWorkingDaysInRange(start, end);
      teamAvgArts = workingDays > 0 ? Math.round((totalArts / workingDays) * 10) / 10 : 0;
    }

    // Calcular quantos dias o top performer bateu a meta
    let daysHitGoal = 0;
    let totalWorkingDays = 0;
    if (topPerformer.id && settings.dailyArtGoal && settings.dailyArtGoal > 0) {
      const { start, end } = getDateRange();
      totalWorkingDays = getWorkingDaysInRange(start, end);
      
      // Agrupar demandas do top performer por dia (apenas no período selecionado)
      const topPerformerDemands = filteredDemands.filter(d => d.userId === topPerformer.id);
      const demandsByDay: Record<string, number> = {};
      
      topPerformerDemands.forEach(d => {
        const demandDate = new Date(d.timestamp);
        const dayKey = `${demandDate.getFullYear()}-${String(demandDate.getMonth() + 1).padStart(2, '0')}-${String(demandDate.getDate()).padStart(2, '0')}`;
        const dayOfWeek = demandDate.getDay();
        
        // Contar apenas dias úteis (Segunda a Sábado) e dentro do período
        if (dayOfWeek >= 1 && dayOfWeek <= 6 && d.timestamp >= start && d.timestamp <= end) {
          if (!demandsByDay[dayKey]) {
            demandsByDay[dayKey] = 0;
          }
          demandsByDay[dayKey] += Number(d.totalQuantity) || 0;
        }
      });
      
      // Contar quantos dias bateram a meta
      Object.values(demandsByDay).forEach(artsInDay => {
        if (artsInDay >= settings.dailyArtGoal) {
          daysHitGoal++;
        }
      });
    }

    return { totalPoints, totalArts, totalDemands, topPerformer, avgArts, teamAvgArts, daysHitGoal, totalWorkingDays };
  }, [filteredDemands, designers, selectedDesigner, dateFilter, customStartDate, customEndDate, settings.dailyArtGoal]);

  const chartData = useMemo(() => {
    const { start, end } = getDateRange();
    const workingDays = getWorkingDaysInRange(start, end);

    const data = designers.map(designer => {
      const designerDemands = filteredDemands.filter(d => d.userId === designer.id);
      // Garantir que os valores são números
      const points = designerDemands.reduce((acc, d) => {
        const totalPoints = Number(d.totalPoints) || 0;
        return acc + totalPoints;
      }, 0);
      const arts = designerDemands.reduce((acc, d) => {
        const totalQuantity = Number(d.totalQuantity) || 0;
        return acc + totalQuantity;
      }, 0);
      const avgPoints = workingDays > 0 ? Math.round(points / workingDays) : 0;
      const avgArts = workingDays > 0 ? Math.round((arts / workingDays) * 10) / 10 : 0;
      
      return {
        name: designer.name.split(' - ')[1] || designer.name,
        fullName: designer.name,
        points: Number(points) || 0,
        arts: Number(arts) || 0,
        avgPoints: Number(avgPoints) || 0,
        avgArts: Number(avgArts) || 0,
        color: getDesignerColor(designer.id)
      };
    }).filter(d => (d.points > 0 || d.arts > 0) && !isNaN(d.points) && !isNaN(d.arts) && isFinite(d.points) && isFinite(d.arts));
    
    return data;
  }, [designers, filteredDemands, dateFilter, customStartDate, customEndDate]);

  const pieData = useMemo(() => {
    return chartData.map(d => ({
      name: d.name,
      value: Number(d.points) || 0,
      color: d.color
    })).filter(d => d.value > 0 && !isNaN(d.value));
  }, [chartData]);

  const { start, end } = getDateRange();
  const workingDays = getWorkingDaysInRange(start, end);

  const formatDateDisplay = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString('pt-BR');
  };

  const getChartDataKey = (): string => {
    switch (chartMode) {
      case 'somaPoints': return 'points';
      case 'somaArts': return 'arts';
      case 'mediaPoints': return 'avgPoints';
      case 'mediaArts': return 'avgArts';
      default: return 'points';
    }
  };


  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Filter className="text-brand-600 dark:text-slate-300" size={20} />
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Visão Geral</h2>
            </div>
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-3.5 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 disabled:opacity-50 shadow-sm hover:shadow"
            >
              <RefreshCw 
                size={16} 
                className={isRefreshing ? 'animate-spin' : ''} 
              />
              <span className="hidden sm:inline">Atualizar</span>
            </button>
          </div>
          
          {/* Lista de designers com status online/offline */}
          <div className="flex flex-wrap items-center gap-3">
            {designers.map(d => {
              const isOnline = isDesignerOnline(d.id);
              // Adicionar key única para forçar re-render quando status mudar
              return (
                <div
                  key={d.id}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                    selectedDesigner === d.id
                      ? 'bg-brand-50 dark:bg-brand-900/20 border-brand-300 dark:border-brand-700 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  onClick={() => setSelectedDesigner(d.id)}
                >
                  <div className="relative flex-shrink-0">
                    <Circle
                      size={10}
                      className={`${
                        isOnline
                          ? 'text-green-500 fill-green-500'
                          : 'text-slate-400 fill-slate-400'
                      }`}
                    />
                    {isOnline && (
                      <Circle
                        size={10}
                        className="absolute inset-0 text-green-500 fill-green-500 animate-ping opacity-75"
                      />
                    )}
                  </div>
                  <span className={`font-medium ${
                    selectedDesigner === d.id
                      ? 'text-brand-700 dark:text-brand-300'
                      : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {d.name.split(' - ')[1] || d.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Visualização</label>
            <button
              onClick={() => setSelectedDesigner(selectedDesigner === 'all' ? '' : 'all')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border ${
                selectedDesigner === 'all'
                  ? 'bg-brand-600 dark:bg-brand-600 text-white border-brand-600 dark:border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <Users size={16} />
              <span>Todos os Designers</span>
            </button>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Data esta entre</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setDateFilter('hoje')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                    dateFilter === 'hoje'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Hoje
                </button>
                <button
                  onClick={() => setDateFilter('semana')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'semana'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semana
                </button>
                <button
                  onClick={() => setDateFilter('semanaPassada')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'semanaPassada'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Semana Passada
                </button>
                <button
                  onClick={() => setDateFilter('mes')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'mes'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Mês
                </button>
              </div>

              <div className="flex items-center gap-2">
                <DatePicker
                  value={customStartDate || formatDateForInput(start)}
                  onChange={(selectedDate) => {
                    setCustomStartDate(selectedDate);
                    setDateFilter('custom');
                  }}
                  title="Data inicial"
                  placeholder="Data inicial"
                />
                <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">até</span>
                <DatePicker
                  value={customEndDate || formatDateForInput(end)}
                  onChange={(selectedDate) => {
                    setCustomEndDate(selectedDate);
                    setDateFilter('custom');
                  }}
                  title="Data final"
                  placeholder="Data final"
                />
                {(customStartDate || customEndDate) && (
                  <button
                    onClick={() => {
                      setCustomStartDate('');
                      setCustomEndDate('');
                      setDateFilter('semana');
                    }}
                    className="px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
                    title="Limpar seleção"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div 
            onClick={() => setSelectedCard(selectedCard === 'arts' ? null : 'arts')}
            className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
              selectedCard === 'arts'
                ? 'border-brand-500 dark:border-brand-500 shadow-md ring-2 ring-brand-200 dark:ring-brand-800'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            title="Total de artes concluídas dentro do período selecionado"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  selectedCard === 'arts'
                    ? 'text-[#280FFF] dark:text-slate-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>Artes Produzidas</p>
                {(() => {
                  const activeDesigners = designers.filter(d => d.role === 'DESIGNER' && d.active);
                  const { start, end } = getDateRange();
                  const workingDays = getWorkingDaysInRange(start, end);
                  
                  // Calcular meta do período
                  let periodGoal = 0;
                  if (selectedDesigner === 'all' || !selectedDesigner) {
                    // Meta total do time
                    const teamDailyGoal = (settings.dailyArtGoal || 0) * activeDesigners.length;
                    if (dateFilter === 'hoje') {
                      periodGoal = teamDailyGoal;
                    } else if (dateFilter === 'semana' || dateFilter === 'semanaPassada') {
                      periodGoal = teamDailyGoal * 6; // 6 dias úteis
                    } else {
                      periodGoal = teamDailyGoal * workingDays;
                    }
                  } else {
                    // Meta individual do designer
                    const dailyGoal = settings.dailyArtGoal || 0;
                    if (dateFilter === 'hoje') {
                      periodGoal = dailyGoal;
                    } else if (dateFilter === 'semana' || dateFilter === 'semanaPassada') {
                      periodGoal = dailyGoal * 6;
                    } else {
                      periodGoal = dailyGoal * workingDays;
                    }
                  }
                  
                  const performance = selectedDesigner === 'all' || !selectedDesigner
                    ? 'medio' // Sem cor quando todos os designers
                    : getArtsPerformance(stats.totalArts, settings.dailyArtGoal || 0);
                  
                  return (
                    <p className={`text-3xl font-bold mt-2 ${
                      selectedDesigner === 'all' || !selectedDesigner
                        ? 'text-slate-900 dark:text-white'
                        : getPerformanceColor(performance)
                    }`}>
                      {stats.totalArts}/{periodGoal}
                    </p>
                  );
                })()}
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg flex-shrink-0 ml-3">
                <Calendar className="text-[#280FFF] dark:text-slate-300" size={22} />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedCard(selectedCard === 'demands' ? null : 'demands')}
            className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
              selectedCard === 'demands'
                ? 'border-brand-500 dark:border-brand-500 shadow-md ring-2 ring-brand-200 dark:ring-brand-800'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-xs font-semibold uppercase tracking-wide ${
                  selectedCard === 'demands'
                    ? 'text-[#280FFF] dark:text-slate-300'
                    : 'text-slate-500 dark:text-slate-400'
                }`}>Demandas</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalDemands}</p>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <TrendingUp className="text-slate-500 dark:text-slate-400" size={22} />
              </div>
            </div>
          </div>

          <div 
            onClick={() => setSelectedCard(selectedCard === 'performance' ? null : 'performance')}
            className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
              selectedCard === 'performance'
                ? 'border-brand-500 dark:border-brand-500 shadow-md ring-2 ring-brand-200 dark:ring-brand-800'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            title={selectedDesigner && selectedDesigner !== 'all' 
              ? "Média de artes produzidas por dia útil no período"
              : selectedDesigner === 'all' || !selectedDesigner
              ? "Média de artes produzidas por dia útil no período"
              : undefined
            }
          >
            <div className="flex items-start justify-between">
              <div>
                {selectedDesigner && selectedDesigner !== 'all' ? (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      selectedCard === 'performance'
                        ? 'text-[#280FFF] dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>Média diária de artes</p>
                    {(() => {
                      const dailyGoal = settings.dailyArtGoal || 0;
                      const performance = getAvgArtsPerformance(stats.avgArts, dailyGoal);
                      
                      // Calcular progresso (limitado entre 0 e 100%)
                      const progress = dailyGoal > 0 
                        ? Math.min(Math.max((stats.avgArts / dailyGoal) * 100, 0), 100)
                        : 0;
                      
                      return (
                        <>
                          <p className={`text-3xl font-bold mt-2 ${getPerformanceColor(performance)}`}>
                            {stats.avgArts.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </p>
                          
                          {/* Barra de progresso */}
                          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress >= 100 
                                  ? 'bg-green-500 dark:bg-green-400'
                                  : progress >= 75
                                  ? 'bg-orange-500 dark:bg-orange-400'
                                  : progress >= 50
                                  ? 'bg-amber-500 dark:bg-amber-400'
                                  : 'bg-red-500 dark:bg-red-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {Math.round(progress)}%
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Meta: {dailyGoal} artes/dia
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      selectedCard === 'performance'
                        ? 'text-[#280FFF] dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>Top Performance</p>
                    <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 truncate">{stats.topPerformer.name}</p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">+{stats.topPerformer.points} pts</p>
                  </>
                )}
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Users className="text-amber-600 dark:text-amber-400" size={22} />
              </div>
            </div>
          </div>

          {dateFilter !== 'hoje' && (
          <div 
            onClick={() => setSelectedCard(selectedCard === 'points' ? null : 'points')}
            className={`bg-white dark:bg-slate-800 rounded-xl p-5 border shadow-sm transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer ${
              selectedCard === 'points'
                ? 'border-brand-500 dark:border-brand-500 shadow-md ring-2 ring-brand-200 dark:ring-brand-800'
                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div>
                {selectedDesigner === 'all' || !selectedDesigner ? (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      selectedCard === 'points'
                        ? 'text-[#280FFF] dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>Média diária de artes</p>
                    {(() => {
                      const activeDesigners = designers.filter(d => d.role === 'DESIGNER' && d.active);
                      const teamDailyGoal = (settings.dailyArtGoal || 0) * activeDesigners.length;
                      const performance = getTeamAvgArtsPerformance(stats.teamAvgArts, teamDailyGoal);
                      
                      // Calcular progresso (limitado entre 0 e 100%)
                      const progress = teamDailyGoal > 0 
                        ? Math.min(Math.max((stats.teamAvgArts / teamDailyGoal) * 100, 0), 100)
                        : 0;
                      
                      return (
                        <>
                          <p className={`text-3xl font-bold mt-2 ${getTeamPerformanceColor(performance)}`}>
                            {stats.teamAvgArts.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                          </p>
                          
                          {/* Barra de progresso */}
                          <div className="mt-3 w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                progress >= 100 
                                  ? 'bg-green-500 dark:bg-green-400'
                                  : progress >= 75
                                  ? 'bg-orange-500 dark:bg-orange-400'
                                  : progress >= 50
                                  ? 'bg-amber-500 dark:bg-amber-400'
                                  : 'bg-red-500 dark:bg-red-400'
                              }`}
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {Math.round(progress)}%
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500">
                              Meta: {teamDailyGoal} artes/dia
                            </p>
                          </div>
                        </>
                      );
                    })()}
                  </>
                ) : stats.topPerformer.id ? (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      selectedCard === 'points'
                        ? 'text-[#280FFF] dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>Meta Batida</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">
                      {stats.daysHitGoal}
                    </p>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                      {stats.totalWorkingDays > 0 ? `de ${stats.totalWorkingDays} dias` : 'dias'}
                    </p>
                  </>
                ) : (
                  <>
                    <p className={`text-xs font-semibold uppercase tracking-wide ${
                      selectedCard === 'points'
                        ? 'text-[#280FFF] dark:text-slate-300'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}>Pontos Totais</p>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalPoints}</p>
                  </>
                )}
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Award className="text-slate-500 dark:text-slate-400" size={22} />
              </div>
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2.5">
              <BarChart3 className="text-slate-500 dark:text-slate-400" size={20} />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Produtividade por Designer
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {customStartDate && customEndDate && customStartDate === customEndDate
                ? `Exibindo dados do dia ${new Date(customStartDate).toLocaleDateString('pt-BR')}`
                : customStartDate && customEndDate
                ? `Período: ${new Date(customStartDate).toLocaleDateString('pt-BR')} até ${new Date(customEndDate).toLocaleDateString('pt-BR')} (${workingDays} dia${workingDays !== 1 ? 's' : ''} útil${workingDays !== 1 ? 'is' : ''})`
                : `${workingDays} dia(s) considerado(s) para a média (Seg-Sab).`}
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setChartMode('somaArts')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                chartMode === 'somaArts'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soma Artes
            </button>
            <button
              onClick={() => setChartMode('somaPoints')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                chartMode === 'somaPoints'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soma Pontos
            </button>
            <button
              onClick={() => setChartMode('mediaPoints')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                chartMode === 'mediaPoints'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Media Pontos
            </button>
            <button
              onClick={() => setChartMode('mediaArts')}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                chartMode === 'mediaArts'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Media Artes
            </button>
          </div>
        </div>

        {chartData && chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart 
              data={chartData.map(d => {
                const key = getChartDataKey();
                const value = Number(d[key]) || 0;
                return {
                  ...d,
                  [key]: isNaN(value) || !isFinite(value) ? 0 : value
                };
              })} 
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: tickColor, fontSize: 12 }} 
                axisLine={{ stroke: gridColor }}
                tickLine={false}
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
                    formatter={(value, name) => {
                      const numValue = Number(value) || 0;
                      return [
                        chartMode.startsWith('media') ? numValue.toFixed(1) : numValue,
                        chartMode.endsWith('Points') ? 'Pontos' : 'Artes'
                      ];
                    }}
                  />
                }
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
              />
              <Bar 
                dataKey={getChartDataKey()} 
                radius={[6, 6, 0, 0]}
                maxBarSize={80}
                style={{ transition: 'opacity 150ms ease' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
            Sem dados para o periodo selecionado
          </div>
        )}
      </div>

      {/* Visualização de Meta Diária Batida - Abaixo do gráfico de Produtividade por Designer */}
      {/* IMPORTANTE: Passar TODAS as demandas, não apenas as filtradas, para calcular corretamente quem bateu a meta na semana */}
      {/* Não passar startDate/endDate para que o componente sempre use a semana atual como padrão */}
      <DailyGoalChart
        demands={demands}
        designers={designers}
        settings={settings}
        isDark={isDark}
      />

      {/* Gráficos de Produtividade */}
      <HistoryCharts demands={demands} designers={designers} />

      {/* Distribuição de Pontos e Resumo por Tipo de Arte - Movidos para o final */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Distribuicao de Pontos
          </h3>
          {pieData && pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData.map(d => {
                      const value = Number(d.value) || 0;
                      return {
                        ...d,
                        value: isNaN(value) || !isFinite(value) || value <= 0 ? 0 : value
                      };
                    }).filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    labelLine={false}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    content={
                      <CustomTooltip 
                        isDark={isDark} 
                        formatter={(value) => {
                          const numValue = Number(value) || 0;
                          return [`${numValue} pts`, 'Pontos'];
                        }}
                      />
                    }
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-4 justify-center">
                {pieData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
                    <span className="text-sm text-slate-600 dark:text-slate-400">{d.name}</span>
                    <span className="text-sm font-medium text-slate-900 dark:text-white">{d.value} pts</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Sem dados para o periodo selecionado
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Resumo por Tipo de Arte
          </h3>
          {chartData.length > 0 ? (
            <div className="space-y-3">
              {(() => {
                const artTypeStats: Record<string, { label: string; quantity: number; points: number }> = {};
                filteredDemands.forEach(demand => {
                  demand.items?.forEach(item => {
                    if (!artTypeStats[item.artTypeId]) {
                      artTypeStats[item.artTypeId] = {
                        label: item.artTypeLabel,
                        quantity: 0,
                        points: 0
                      };
                    }
                    const quantity = Number(item.quantity) || 0;
                    const totalPoints = Number(item.totalPoints) || 0;
                    artTypeStats[item.artTypeId].quantity += quantity;
                    artTypeStats[item.artTypeId].points += totalPoints;
                  });
                });
                const sorted = Object.values(artTypeStats)
                  .map(stat => ({
                    ...stat,
                    quantity: Number(stat.quantity) || 0,
                    points: Number(stat.points) || 0
                  }))
                  .filter(stat => !isNaN(stat.points) && !isNaN(stat.quantity))
                  .sort((a, b) => b.points - a.points);
                const maxPoints = Math.max(...sorted.map(s => s.points), 1);

                return sorted.slice(0, 6).map((stat, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-700 dark:text-slate-300">{stat.label}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {stat.quantity} artes | {stat.points} pts
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-600 rounded-full transition-all"
                        style={{ width: `${(stat.points / maxPoints) * 100}%` }}
                      />
                    </div>
                  </div>
                ));
              })()}
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-slate-500">
              Sem dados para o periodo selecionado
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function formatDateForInput(timestamp: number): string {
  // Formatar timestamp para string YYYY-MM-DD usando timezone local
  // IMPORTANTE: new Date(timestamp) já interpreta o timestamp no timezone local
  // getDate(), getMonth(), getFullYear() retornam valores no timezone local
  // NÃO usar getUTCDate(), getUTCMonth(), getUTCFullYear() para evitar deslocamento de -1 dia
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11, então +1
  const day = String(date.getDate()).padStart(2, '0'); // getDate() retorna 1-31 no timezone local
  return `${year}-${month}-${day}`;
}
