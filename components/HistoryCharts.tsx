import React, { useMemo, useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, Cell } from 'recharts';
import { BarChart3, TrendingUp, Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Demand, User } from '../types';

type ChartTab = 'semana' | 'mes' | 'ano';

// Cor azul padrão do sistema (fallback)
const DEFAULT_BLUE = '#3B82F6';

// Componente de Tooltip customizado com tema
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
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
          return (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div 
                className="w-2.5 h-2.5 rounded-full" 
                style={{ backgroundColor: entry.color }}
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

interface HistoryChartsProps {
  demands: Demand[];
  designers: User[];
}

// Função utilitária para obter cor do designer
const getDesignerColor = (designer: User, index: number): string => {
  // Primeiro: usar avatarColor se existir
  if (designer.avatarColor) return designer.avatarColor;
  
  // Segundo: extrair cor do avatarUrl
  const avatarUrl = designer.avatarUrl || '';
  const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
  if (bgMatch) return `#${bgMatch[1]}`;
  
  // Fallback: usar azul padrão do sistema
  return DEFAULT_BLUE;
};

// Função para obter produtividade semanal (semanas do mês selecionado)
// Cada semana considera apenas dias úteis: segunda a sábado (excluindo domingos)
const getWeeklyProductivity = (demands: Demand[], designers: User[], selectedYear: number, selectedMonth: number) => {
  // Primeiro dia do mês selecionado
  const firstDay = new Date(selectedYear, selectedMonth, 1);
  // Último dia do mês selecionado
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0);
  
  // Encontrar a segunda-feira da semana que contém o primeiro dia do mês
  const firstDayOfWeek = firstDay.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  let weekStart = new Date(firstDay);
  
  // Se o primeiro dia não é segunda-feira, voltar para a segunda-feira daquela semana
  if (firstDayOfWeek === 0) {
    // Se for domingo, voltar 6 dias para chegar na segunda-feira anterior
    weekStart.setDate(weekStart.getDate() - 6);
  } else if (firstDayOfWeek !== 1) {
    // Se não for segunda-feira (terça a sábado), voltar para a segunda-feira daquela semana
    weekStart.setDate(weekStart.getDate() - (firstDayOfWeek - 1));
  }
  
  // Calcular semanas do mês (segunda a sábado, excluindo domingos)
  const weeks: { start: Date; end: Date; label: string }[] = [];
  let weekNum = 1;
  let currentWeekStart = new Date(weekStart);
  
  // Continuar enquanto a semana tem interseção com o mês selecionado
  while (true) {
    // Sábado da semana (5 dias após a segunda) - fim da semana útil (excluindo domingo)
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(weekEnd.getDate() + 5); // Segunda + 5 dias = Sábado
    weekEnd.setHours(23, 59, 59, 999);
    
    // Verificar se a semana tem interseção com o mês selecionado
    // A semana tem interseção se: weekEnd >= firstDay E currentWeekStart <= lastDay
    if (weekEnd < firstDay) {
      // Semana termina antes do mês começar, avançar para próxima semana
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      continue;
    }
    
    if (currentWeekStart > lastDay) {
      // Semana começa depois do mês terminar, parar
      break;
    }
    
    // Ajustar início e fim para não ultrapassar os limites do mês
    // Mas garantir que não incluamos domingos
    let actualStart = currentWeekStart < firstDay ? new Date(firstDay) : new Date(currentWeekStart);
    let actualEnd = weekEnd > lastDay ? new Date(lastDay) : new Date(weekEnd);
    
    // Se o actualStart for domingo, avançar para segunda
    if (actualStart.getDay() === 0) {
      actualStart.setDate(actualStart.getDate() + 1);
    }
    
    // Se o actualEnd for domingo, voltar para sábado
    if (actualEnd.getDay() === 0) {
      actualEnd.setDate(actualEnd.getDate() - 1);
      actualEnd.setHours(23, 59, 59, 999);
    }
    
    // Verificar se ainda há interseção válida (não apenas domingo)
    if (actualStart > actualEnd || actualStart > lastDay || actualEnd < firstDay) {
      // Sem interseção válida, avançar para próxima semana
      currentWeekStart.setDate(currentWeekStart.getDate() + 7);
      continue;
    }
    
    // Formatar label com datas (mostrar apenas dias do mês selecionado)
    const startDay = actualStart.getDate();
    const endDay = actualEnd.getDate();
    const startMonth = actualStart.getMonth() + 1;
    const endMonth = actualEnd.getMonth() + 1;
    const selectedMonthNum = selectedMonth + 1;
    
    let label = `Sem ${weekNum}`;
    if (startMonth === selectedMonthNum && endMonth === selectedMonthNum) {
      // Semana completa ou parcial dentro do mês (segunda a sábado)
      label = `Sem ${weekNum} (${startDay}-${endDay})`;
    } else if (startMonth === selectedMonthNum) {
      // Semana começa no mês mas termina no próximo
      label = `Sem ${weekNum} (${startDay}-${endDay}/${endMonth})`;
    } else if (endMonth === selectedMonthNum) {
      // Semana começa no mês anterior mas termina no mês selecionado
      label = `Sem ${weekNum} (${startDay}/${startMonth}-${endDay})`;
    }
    
    weeks.push({
      start: new Date(actualStart),
      end: new Date(actualEnd),
      label
    });
    
    // Avançar para a próxima segunda-feira
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    weekNum++;
  }
  
  // Agrupar demandas por semana e designer
  return weeks.map(week => {
    const weekData: Record<string, number | string> = { name: week.label };
    
    designers.forEach((designer, idx) => {
      const designerDemands = demands.filter(d => {
        const demandDate = new Date(d.timestamp);
        const dayOfWeek = demandDate.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
        
        // Ignorar domingos (dayOfWeek === 0)
        if (dayOfWeek === 0) {
          return false;
        }
        
        demandDate.setHours(0, 0, 0, 0);
        const weekStartTime = new Date(week.start);
        weekStartTime.setHours(0, 0, 0, 0);
        const weekEndTime = new Date(week.end);
        weekEndTime.setHours(23, 59, 59, 999);
        
        return d.userId === designer.id && 
               demandDate.getTime() >= weekStartTime.getTime() && 
               demandDate.getTime() <= weekEndTime.getTime();
      });
      
      const shortName = designer.name.split(' - ')[1] || designer.name.split(' ')[0];
      weekData[shortName] = designerDemands.reduce((acc, d) => {
        const quantity = Number(d.totalQuantity) || 0;
        return acc + quantity;
      }, 0);
    });
    
    return weekData;
  });
};

// Função para obter produtividade mensal (meses do ano atual)
const getMonthlyProductivity = (demands: Demand[], designers: User[]) => {
  const now = new Date();
  const year = now.getFullYear();
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  
  return months.map((monthName, monthIndex) => {
    const monthStart = new Date(year, monthIndex, 1);
    const monthEnd = new Date(year, monthIndex + 1, 0, 23, 59, 59, 999);
    
    const monthData: Record<string, number | string> = { name: monthName };
    
    designers.forEach(designer => {
      const designerDemands = demands.filter(d => {
        const demandDate = new Date(d.timestamp);
        return d.userId === designer.id && 
               demandDate >= monthStart && 
               demandDate <= monthEnd;
      });
      
      const shortName = designer.name.split(' - ')[1] || designer.name.split(' ')[0];
      monthData[shortName] = designerDemands.reduce((acc, d) => {
        const quantity = Number(d.totalQuantity) || 0;
        return acc + quantity;
      }, 0);
    });
    
    return monthData;
  });
};

// Função para obter produtividade anual consolidada
const getYearlyProductivity = (demands: Demand[], designers: User[]) => {
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);
  
  return designers.map((designer, idx) => {
    const designerDemands = demands.filter(d => {
      const demandDate = new Date(d.timestamp);
      return d.userId === designer.id && 
             demandDate >= yearStart && 
             demandDate <= yearEnd;
    });
    
    const totalArts = designerDemands.reduce((acc, d) => {
      const quantity = Number(d.totalQuantity) || 0;
      return acc + quantity;
    }, 0);
    const totalPoints = designerDemands.reduce((acc, d) => {
      const points = Number(d.totalPoints) || 0;
      return acc + points;
    }, 0);
    const totalDemands = designerDemands.length;
    const avgMonthly = Math.round(totalArts / 12);
    
    return {
      name: designer.name.split(' - ')[1] || designer.name.split(' ')[0],
      fullName: designer.name,
      artes: Number(totalArts) || 0,
      pontos: Number(totalPoints) || 0,
      demandas: totalDemands,
      mediaMensal: Number(avgMonthly) || 0,
      color: getDesignerColor(designer, idx)
    };
  }).filter(d => d.artes > 0 || d.pontos > 0);
};

export const HistoryCharts: React.FC<HistoryChartsProps> = ({ demands, designers }) => {
  const now = new Date();
  const [activeTab, setActiveTab] = useState<ChartTab>('semana');
  const [isDark, setIsDark] = useState(false);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());

  // Detectar tema claro/escuro
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    
    // Observer para mudanças de tema
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    return () => observer.disconnect();
  }, []);

  const weeklyData = useMemo(() => getWeeklyProductivity(demands, designers, selectedYear, selectedMonth), [demands, designers, selectedYear, selectedMonth]);
  const monthlyData = useMemo(() => getMonthlyProductivity(demands, designers), [demands, designers]);
  const yearlyData = useMemo(() => getYearlyProductivity(demands, designers), [demands, designers]);

  const designerNames = designers.map(d => d.name.split(' - ')[1] || d.name.split(' ')[0]);
  const designerColors = designers.map((d, i) => getDesignerColor(d, i));

  // Cores do grid baseadas no tema
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#94a3b8' : '#64748b';

  const tabs: { id: ChartTab; label: string; icon: React.ReactNode }[] = [
    { id: 'semana', label: 'Semana', icon: <Calendar size={16} /> },
    { id: 'mes', label: 'Mês', icon: <TrendingUp size={16} /> },
    { id: 'ano', label: 'Ano', icon: <BarChart3 size={16} /> },
  ];

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  
  // Funções para navegar entre meses
  const handlePreviousMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };
  
  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };
  
  const handleResetToCurrent = () => {
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth());
  };
  
  // Função para formatar data para input month
  const formatMonthForInput = (year: number, month: number): string => {
    return `${year}-${String(month + 1).padStart(2, '0')}`;
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="text-brand-600 dark:text-slate-300" size={20} />
            Gráficos de Produtividade
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {activeTab === 'semana' && `Semanas de ${monthNames[selectedMonth]} ${selectedYear}`}
            {activeTab === 'mes' && `Meses de ${now.getFullYear()}`}
            {activeTab === 'ano' && `Consolidado ${now.getFullYear()}`}
          </p>
        </div>

        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Semana - Gráfico de Barras */}
      {activeTab === 'semana' && (
        <div>
          {/* Seletor de Período para Gráfico Semanal */}
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <Calendar className="text-slate-500 dark:text-slate-400" size={18} />
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Período:</span>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={handlePreviousMonth}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow"
                title="Mês anterior"
              >
                <ChevronLeft size={18} />
              </button>
              
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none z-10" size={16} />
                <input
                  type="month"
                  value={formatMonthForInput(selectedYear, selectedMonth)}
                  onChange={(e) => {
                    const [year, month] = e.target.value.split('-').map(Number);
                    setSelectedYear(year);
                    setSelectedMonth(month - 1);
                  }}
                  className="pl-10 pr-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-900 dark:text-white focus:ring-2 focus:ring-brand-600 focus:border-transparent outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 cursor-pointer shadow-sm hover:shadow w-full"
                  title="Selecionar mês e ano"
                  onClick={(e) => {
                    (e.target as HTMLInputElement).showPicker?.();
                  }}
                />
              </div>
              
              <button
                onClick={handleNextMonth}
                className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-sm hover:shadow"
                title="Próximo mês"
              >
                <ChevronRight size={18} />
              </button>
              
              {(selectedYear !== now.getFullYear() || selectedMonth !== now.getMonth()) && (
                <button
                  onClick={handleResetToCurrent}
                  className="px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all duration-200 flex items-center gap-1.5 shadow-sm hover:shadow"
                  title="Voltar para o mês atual"
                >
                  <X size={14} />
                  Hoje
                </button>
              )}
            </div>
          </div>
          
          {weeklyData.length > 0 && designers.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={weeklyData} barCategoryGap="15%">
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
                  label={{ value: 'Artes', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 12 }}
                />
                <Tooltip 
                  content={<CustomTooltip isDark={isDark} />}
                  cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span style={{ color: tickColor, fontSize: 12 }}>{value}</span>}
                />
                {designerNames.map((name, idx) => (
                  <Bar 
                    key={name}
                    dataKey={name} 
                    fill={designerColors[idx]}
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                    style={{ transition: 'opacity 150ms ease' }}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              Sem dados para o período selecionado
            </div>
          )}
        </div>
      )}

      {/* Tab Mês - Gráfico de Linhas */}
      {activeTab === 'mes' && (
        <div>
          {monthlyData.length > 0 && designers.length > 0 ? (
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
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
                  label={{ value: 'Artes', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 12 }}
                />
                <Tooltip 
                  content={<CustomTooltip isDark={isDark} />}
                  cursor={{ stroke: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', strokeWidth: 1 }}
                />
                <Legend 
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => <span style={{ color: tickColor, fontSize: 12 }}>{value}</span>}
                />
                {designerNames.map((name, idx) => (
                  <Line 
                    key={name}
                    type="monotone"
                    dataKey={name} 
                    stroke={designerColors[idx]}
                    strokeWidth={2}
                    dot={{ fill: designerColors[idx], strokeWidth: 2, r: 4 }}
                    activeDot={{ 
                      r: 7, 
                      fill: designerColors[idx], 
                      stroke: isDark ? '#1f2937' : '#ffffff',
                      strokeWidth: 2
                    }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              Sem dados para o período selecionado
            </div>
          )}
        </div>
      )}

      {/* Tab Ano - Gráfico de Barras + Métricas */}
      {activeTab === 'ano' && (
        <div>
          {yearlyData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={yearlyData} barCategoryGap="20%">
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
                          const labels: Record<string, string> = {
                            artes: 'Artes',
                            pontos: 'Pontos',
                            demandas: 'Demandas',
                            mediaMensal: 'Média Mensal'
                          };
                          return [value, labels[name] || name];
                        }}
                      />
                    }
                    cursor={{ fill: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }}
                  />
                  <Bar 
                    dataKey="artes" 
                    name="Artes"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={80}
                    style={{ transition: 'opacity 150ms ease' }}
                  >
                    {yearlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Métricas adicionais */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {yearlyData.map((designer, idx) => (
                  <div 
                    key={idx}
                    className="bg-slate-50 dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: designer.color }}
                      />
                      <span className="font-medium text-slate-900 dark:text-white text-sm">
                        {designer.name}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Artes</p>
                        <p className="font-bold text-slate-900 dark:text-white">{designer.artes}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Pontos</p>
                        <p className="font-bold text-brand-600 dark:text-white">{designer.pontos}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Demandas</p>
                        <p className="font-bold text-slate-900 dark:text-white">{designer.demandas}</p>
                      </div>
                      <div>
                        <p className="text-slate-500 dark:text-slate-400">Média/Mês</p>
                        <p className="font-bold text-slate-900 dark:text-white">{designer.mediaMensal}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
              Sem dados para o período selecionado
            </div>
          )}
        </div>
      )}
    </div>
  );
};

