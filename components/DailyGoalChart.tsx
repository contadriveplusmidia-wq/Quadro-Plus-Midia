import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
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
    hitGoalToday?: boolean; // Indica se bateu a meta neste dia específico
  }>;
}

interface DailyGoalChartProps {
  demands: Demand[];
  designers: User[];
  settings: SystemSettings;
  startDate?: number;
  endDate?: number;
  isDark?: boolean;
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
  const navigate = useNavigate();
  const { setAdminFilters } = useApp();
  
  // Estado interno para controle de datas
  // SEMPRE inicializar com semana atual (padrão)
  const currentWeek = getCurrentWeekRange();
  const [internalStartDate, setInternalStartDate] = useState<number>(currentWeek.start);
  const [internalEndDate, setInternalEndDate] = useState<number>(currentWeek.end);

  // SEMPRE usar semana atual como padrão
  // Não sincronizar com props para manter independência
  // O componente sempre mostra a semana atual por padrão

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

  // Calcular todos os designers que têm demandas na semana (não apenas os que bateram a meta)
  const designersWithDemandsThisWeek = useMemo(() => {
    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(endDate);
    weekEnd.setHours(23, 59, 59, 999);

    // Filtrar demandas da semana
    const weekDemands = demands.filter(d => {
      const demandTime = d.timestamp;
      return demandTime >= weekStart.getTime() && demandTime <= weekEnd.getTime();
    });

    // Encontrar todos os designers únicos que têm demandas na semana
    const designerIds = new Set<string>();
    weekDemands.forEach(demand => {
      designerIds.add(demand.userId);
    });

    // Retornar lista de todos os designers com demandas na semana
    const result = Array.from(designerIds).map(designerId => {
      const designer = designers.find(d => d.id === designerId);
      if (!designer) return null;
      return {
        designerId,
        designerName: designer.name.split(' - ')[1] || designer.name || 'Designer',
        color: getDesignerColor(designerId)
      };
    }).filter(Boolean) as Array<{
      designerId: string;
      designerName: string;
      color: string;
    }>;
    
    return result;
  }, [demands, designers, startDate, endDate]);

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
          const quantity = Number(demand.totalQuantity) || 0;
          designerArts[demand.userId].count += quantity;
        });

        // Mostrar TODOS os designers que têm demandas na semana
        // Sempre mostrar a barra, mas ocultar o nome quando não bater a meta
        const designersForDay = designersWithDemandsThisWeek.map(designer => {
          const dayCount = Number(designerArts[designer.designerId]?.count || 0);
          const hitGoalToday = dayCount >= dailyGoal;
          
          return {
            designerId: designer.designerId,
            designerName: designer.designerName,
            artsCount: dayCount,
            color: designer.color,
            hitGoalToday // Flag para indicar se bateu a meta neste dia específico
          };
        }).filter(d => !isNaN(d.artsCount) && d.artsCount > 0).sort((a, b) => {
          // Ordenar: primeiro os que bateram hoje, depois por quantidade
          if (a.hitGoalToday && !b.hitGoalToday) return -1;
          if (!a.hitGoalToday && b.hitGoalToday) return 1;
          return b.artsCount - a.artsCount;
        });

        // Formatar label com dia da semana e número do dia
        const dayNumber = current.getDate();
        const dayLabel = `${shortDayNames[dayOfWeek]} ${dayNumber}`;
        
        days.push({
          date: new Date(current),
          label: dayLabel,
          designers: designersForDay
        });
      }

      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [demands, designers, startDate, endDate, dailyGoal, designersWithDemandsThisWeek]);

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
  // Comparar com margem de tolerância (1 segundo) para evitar problemas de precisão
  const isCurrentWeek = Math.abs(startDate - currentWeekRange.start) < 1000 && Math.abs(endDate - currentWeekRange.end) < 1000;
  const lastWeekRange = getLastWeekRange();
  const isLastWeek = Math.abs(startDate - lastWeekRange.start) < 1000 && Math.abs(endDate - lastWeekRange.end) < 1000;

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
                                onClick={() => {
                                  // Definir filtro do designer para o DIA ESPECÍFICO clicado
                                  // Usar o dia da demanda (day.date) para filtrar apenas aquele dia
                                  const clickedDay = new Date(day.date);
                                  clickedDay.setHours(0, 0, 0, 0);
                                  const clickedDayEnd = new Date(day.date);
                                  clickedDayEnd.setHours(23, 59, 59, 999);
                                  
                                  // Verificar se o dia clicado é hoje
                                  const today = new Date();
                                  today.setHours(0, 0, 0, 0);
                                  const isToday = clickedDay.getTime() === today.getTime();
                                  
                                  setAdminFilters({
                                    period: isToday ? 'today' : 'custom',
                                    designerId: designer.designerId,
                                    customRange: isToday ? undefined : {
                                      start: clickedDay,
                                      end: clickedDayEnd
                                    }
                                  });
                                  navigate('/admin/history');
                                }}
                                className={`w-full rounded transition-all duration-200 cursor-pointer flex items-center justify-center relative overflow-hidden hover:opacity-100`}
                                style={{
                                  backgroundColor: designer.color,
                                  height: designer.artsCount > 0 
                                    ? `${Math.min(100, (designer.artsCount / (dailyGoal * 2)) * 100)}%`
                                    : '32px',
                                  minHeight: '32px',
                                  // Opacidade: sempre visível, mas um pouco mais transparente quando não bateu a meta
                                  opacity: isHovered ? 1 : (designer.hitGoalToday ? 0.9 : 0.6)
                                }}
                                title={`Clique para ver demandas de ${designer.designerName}${designer.hitGoalToday ? ' (Meta batida hoje)' : ' (Meta não batida hoje)'}`}
                              >
                                {/* Nome do designer na barra - apenas quando bater a meta */}
                                {designer.hitGoalToday && (
                                  <span 
                                    className="text-xs font-semibold text-white px-1.5 py-0.5 truncate w-full text-center"
                                    style={{
                                      textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                                    }}
                                  >
                                    {designer.designerName}
                                  </span>
                                )}
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
                                    <div>Artes hoje: {designer.artsCount}</div>
                                    <div>Meta: {dailyGoal}</div>
                                    {designer.hitGoalToday ? (
                                      <div className="text-green-600 dark:text-green-400 font-semibold mt-1">
                                        ✓ Meta batida
                                      </div>
                                    ) : (
                                      <div className="text-slate-400 text-xs mt-1">
                                        Meta não batida hoje
                                      </div>
                                    )}
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

