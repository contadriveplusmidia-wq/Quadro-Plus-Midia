import React, { useMemo, useState, useEffect } from 'react';
import { Target, Calendar, X } from 'lucide-react';
import { Demand, User, SystemSettings } from '../types';
import { DatePicker } from './DatePicker';

interface DayData {
  date: Date;
  label: string;
  designers: Array<{
    designerId: string;
    designerName: string;
    artsCount: number;
    color: string;
  }>;
}

// Função para formatar timestamp para string YYYY-MM-DD
function formatDateForInput(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Função para obter início e fim da semana atual (Segunda a Sábado)
function getCurrentWeekRange(): { start: number; end: number } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay(); // 0 = domingo, 1 = segunda, ..., 6 = sábado
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Dias até segunda-feira
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - daysToMonday);
  weekStart.setHours(0, 0, 0, 0);
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // Sábado (6 dias úteis: Seg-Sab)
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart.getTime(), end: weekEnd.getTime() };
}

// Função para obter início e fim da semana passada (Segunda a Sábado)
function getLastWeekRange(): { start: number; end: number } {
  const currentWeek = getCurrentWeekRange();
  const weekStart = new Date(currentWeek.start);
  weekStart.setDate(weekStart.getDate() - 7); // 7 dias antes
  
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 5); // Sábado
  weekEnd.setHours(23, 59, 59, 999);
  
  return { start: weekStart.getTime(), end: weekEnd.getTime() };
}

export const DailyGoalChart: React.FC<DailyGoalChartProps> = ({
  demands,
  designers,
  settings,
  startDate: propStartDate,
  endDate: propEndDate,
  isDark
}) => {
  // Estado interno para controle de datas
  const [internalStartDate, setInternalStartDate] = useState<number>(() => {
    if (propStartDate) return propStartDate;
    return getCurrentWeekRange().start;
  });
  const [internalEndDate, setInternalEndDate] = useState<number>(() => {
    if (propEndDate) return propEndDate;
    return getCurrentWeekRange().end;
  });

  // Sincronizar com props se mudarem
  useEffect(() => {
    if (propStartDate) setInternalStartDate(propStartDate);
    if (propEndDate) setInternalEndDate(propEndDate);
  }, [propStartDate, propEndDate]);

  const [hoveredDay, setHoveredDay] = useState<number | null>(null);
  const [hoveredDesigner, setHoveredDesigner] = useState<string | null>(null);

  const dailyGoal = settings.dailyArtGoal || 8;

  // Usar datas internas
  const startDate = internalStartDate;
  const endDate = internalEndDate;

  // Obter cor do designer
  const getDesignerColor = (designerId: string): string => {
    const designer = designers.find(d => d.id === designerId);
    if (designer?.avatarColor) return designer.avatarColor;
    const avatarUrl = designer?.avatarUrl || '';
    const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
    if (bgMatch) return `#${bgMatch[1]}`;
    const colors = ['#4F46E5', '#06b6d4', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6'];
    const index = designers.findIndex(d => d.id === designerId);
    return colors[index % colors.length];
  };

  // Calcular dados por dia da semana
  const weekData = useMemo(() => {
    const days: DayData[] = [];
    const current = new Date(startDate);
    const end = new Date(endDate);

    // Nomes dos dias da semana
    const shortDayNames = ['Dom', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sab'];

    // Criar array com os dias úteis (Segunda a Sábado) do período
    while (current <= end) {
      const dayOfWeek = current.getDay();
      
      // Considerar apenas Segunda (1) a Sábado (6), ignorando Domingo (0)
      if (dayOfWeek >= 1 && dayOfWeek <= 6) {
        const dayStart = new Date(current);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(current);
        dayEnd.setHours(23, 59, 59, 999);

        // Filtrar demandas deste dia
        const dayDemands = demands.filter(d => {
          const demandDate = new Date(d.timestamp);
          const demandTime = demandDate.getTime();
          return demandTime >= dayStart.getTime() && demandTime <= dayEnd.getTime();
        });

        // Agrupar por designer e calcular artes
        const designerArts: Record<string, { name: string; count: number }> = {};
        dayDemands.forEach(demand => {
          if (!designerArts[demand.userId]) {
            const designer = designers.find(des => des.id === demand.userId);
            designerArts[demand.userId] = {
              name: designer?.name.split(' - ')[1] || designer?.name || 'Designer',
              count: 0
            };
          }
          designerArts[demand.userId].count += demand.totalQuantity;
        });

        // Filtrar apenas designers que bateram ou ultrapassaram a meta
        const designersWhoHitGoal = Object.entries(designerArts)
          .filter(([_, data]) => data.count >= dailyGoal)
          .map(([designerId, data]) => ({
            designerId,
            designerName: data.name,
            artsCount: data.count,
            color: getDesignerColor(designerId)
          }))
          .sort((a, b) => b.artsCount - a.artsCount); // Ordenar por quantidade (maior primeiro)

        days.push({
          date: new Date(current),
          label: shortDayNames[dayOfWeek],
          designers: designersWhoHitGoal
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [demands, designers, startDate, endDate, dailyGoal]);

  // Formatar data para exibição
  const formatDateRange = () => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    return {
      start: start.toLocaleDateString('pt-BR'),
      end: end.toLocaleDateString('pt-BR')
    };
  };

  const dateRange = formatDateRange();

  // Handlers para botões de atalho
  const handleCurrentWeek = () => {
    const range = getCurrentWeekRange();
    setInternalStartDate(range.start);
    setInternalEndDate(range.end);
  };

  const handleLastWeek = () => {
    const range = getLastWeekRange();
    setInternalStartDate(range.start);
    setInternalEndDate(range.end);
  };

  // Verificar se está na semana atual
  const currentWeekRange = getCurrentWeekRange();
  const isCurrentWeek = startDate === currentWeekRange.start && endDate === currentWeekRange.end;
  const lastWeekRange = getLastWeekRange();
  const isLastWeek = startDate === lastWeekRange.start && endDate === lastWeekRange.end;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <Target className="text-slate-500 dark:text-slate-400" size={20} />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
              Meta Diária Batida
            </h3>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Meta diária: {dailyGoal} artes
          </p>
        </div>

        {/* Controles de data */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* Botões de atalho */}
            <button
              onClick={handleCurrentWeek}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isCurrentWeek
                  ? 'bg-brand-600 dark:bg-brand-600 text-white border border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Semana Atual
            </button>
            <button
              onClick={handleLastWeek}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                isLastWeek
                  ? 'bg-brand-600 dark:bg-brand-600 text-white border border-brand-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              Semana Passada
            </button>
          </div>

          {/* DatePickers */}
          <div className="flex items-center gap-2">
            <DatePicker
              value={formatDateForInput(startDate)}
              onChange={(selectedDate) => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setHours(0, 0, 0, 0);
                setInternalStartDate(date.getTime());
              }}
              title="Data inicial"
              placeholder="Data inicial"
            />
            <span className="text-slate-400 dark:text-slate-500 font-medium text-sm">até</span>
            <DatePicker
              value={formatDateForInput(endDate)}
              onChange={(selectedDate) => {
                const [year, month, day] = selectedDate.split('-').map(Number);
                const date = new Date(year, month - 1, day);
                date.setHours(23, 59, 59, 999);
                setInternalEndDate(date.getTime());
              }}
              title="Data final"
              placeholder="Data final"
            />
            {(startDate !== currentWeekRange.start || endDate !== currentWeekRange.end) && (
              <button
                onClick={handleCurrentWeek}
                className="px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-200 shadow-sm hover:shadow"
                title="Voltar para semana atual"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {weekData.length > 0 ? (
        <div className="space-y-4">
          {/* Cabeçalho com dias da semana */}
          <div className="grid grid-cols-6 gap-3">
            {weekData.map((day, index) => {
              const dayKey = day.date.getTime();
              return (
                <div key={dayKey} className="flex flex-col">
                  <div className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-2 text-center">
                    {day.label}
                  </div>
                  <div className="relative min-h-[120px] bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2 border border-slate-200 dark:border-slate-700">
                    {day.designers.length > 0 ? (
                      <div className="flex flex-col gap-1.5 h-full justify-end">
                        {day.designers.map((designer) => {
                          const isHovered = hoveredDay === dayKey && hoveredDesigner === designer.designerId;
                          return (
                            <div
                              key={designer.designerId}
                              className="relative group"
                              onMouseEnter={() => {
                                setHoveredDay(dayKey);
                                setHoveredDesigner(designer.designerId);
                              }}
                              onMouseLeave={() => {
                                setHoveredDay(null);
                                setHoveredDesigner(null);
                              }}
                            >
                              <div
                                className="w-full rounded transition-all duration-200 cursor-pointer flex items-center justify-center relative overflow-hidden"
                                style={{
                                  backgroundColor: designer.color,
                                  height: `${Math.min(100, (designer.artsCount / (dailyGoal * 2)) * 100)}%`,
                                  minHeight: '32px',
                                  opacity: isHovered ? 1 : 0.85
                                }}
                              >
                                {/* Nome do designer na barra */}
                                <span 
                                  className="text-xs font-semibold text-white px-1.5 py-0.5 truncate w-full text-center"
                                  style={{
                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                  }}
                                >
                                  {designer.designerName}
                                </span>
                              </div>
                              
                              {/* Tooltip no hover */}
                              {isHovered && (
                                <div
                                  className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap ${
                                    isDark
                                      ? 'bg-gray-800 border border-gray-600'
                                      : 'bg-white border border-gray-200'
                                  }`}
                                >
                                  <div className="text-xs font-semibold mb-1 text-slate-900 dark:text-white">
                                    {designer.designerName}
                                  </div>
                                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-0.5">
                                    <div>Artes: {designer.artsCount}</div>
                                    <div>Meta: {dailyGoal}</div>
                                  </div>
                                  <div
                                    className={`absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 ${
                                      isDark
                                        ? 'border-t-gray-800'
                                        : 'border-t-white'
                                    }`}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="h-[200px] flex items-center justify-center text-slate-500 dark:text-slate-400">
          Sem dados para o período selecionado
        </div>
      )}
    </div>
  );
};

