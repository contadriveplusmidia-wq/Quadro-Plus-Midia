import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, ChevronDown, Users, Filter, X, Trash2 } from 'lucide-react';
import { TimeFilter, WorkSessionRow } from '../types';
import { HistoryCharts } from '../components/HistoryCharts';
import { DatePicker } from '../components/DatePicker';

export const AdminHistory: React.FC = () => {
  const { users, demands, workSessions, adminFilters, setAdminFilters, deleteDemand, refreshData } = useApp();
  const [viewMode, setViewMode] = useState<'sessions' | 'demands' | 'charts'>('sessions');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Se vier com filtro de designer, definir viewMode como 'demands'
  // E configurar as datas customizadas se vierem no customRange
  useEffect(() => {
    if (adminFilters.designerId !== 'all') {
      setViewMode('demands');
      
      // Se customRange foi definido e período é 'today', significa que veio de um clique
      // Nesse caso, manter período como 'today' mas usar o customRange para o dia clicado
      if (adminFilters.customRange && adminFilters.period === 'today') {
        // Não precisa preencher customStartDate/customEndDate pois o período é 'today'
        // O getDateRange vai usar o customRange quando período for 'today'
      } else if (adminFilters.customRange && adminFilters.period === 'custom') {
        // Se período é 'custom', preencher as datas
        const startDateStr = formatDateForInput(adminFilters.customRange.start.getTime());
        const endDateStr = formatDateForInput(adminFilters.customRange.end.getTime());
        setCustomStartDate(startDateStr);
        setCustomEndDate(endDateStr);
      }
    }
  }, [adminFilters.designerId, adminFilters.period, adminFilters.customRange]);

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  const getDateRange = (): { start: number; end: number } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (adminFilters.period) {
      case 'today':
        // Se customRange existe e período é 'today', usar o dia do customRange (dia clicado)
        if (adminFilters.customRange && adminFilters.period === 'today') {
          const clickedDay = new Date(adminFilters.customRange.start);
          clickedDay.setHours(0, 0, 0, 0);
          const clickedDayEnd = new Date(adminFilters.customRange.end);
          clickedDayEnd.setHours(23, 59, 59, 999);
          return { start: clickedDay.getTime(), end: clickedDayEnd.getTime() };
        }
        return { start: today.getTime(), end: now.getTime() };
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { start: yesterday.getTime(), end: today.getTime() - 1 };
      case 'weekly':
        const weekStart = new Date(today);
        const dayOfWeek = weekStart.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        weekStart.setDate(weekStart.getDate() - diff);
        return { start: weekStart.getTime(), end: now.getTime() };
      case 'monthly':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        return { start: monthStart.getTime(), end: now.getTime() };
      case 'yearly':
        const yearStart = new Date(now.getFullYear(), 0, 1);
        return { start: yearStart.getTime(), end: now.getTime() };
      case 'custom':
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          
          // Se as datas são iguais, retornar apenas um dia
          if (customStartDate === customEndDate) {
            return { start: start.getTime(), end: endDate.getTime() };
          }
          
          return { start: start.getTime(), end: endDate.getTime() };
        }
        // Se apenas uma data foi selecionada, usar como início e fim
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customStartDate);
          end.setHours(23, 59, 59, 999);
          return { start: start.getTime(), end: end.getTime() };
        }
        if (customEndDate) {
          const start = new Date(customEndDate);
          start.setHours(0, 0, 0, 0);
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          return { start: start.getTime(), end: end.getTime() };
        }
        // Fallback para customRange do adminFilters se existir
        if (adminFilters.customRange) {
          return {
            start: adminFilters.customRange.start.getTime(),
            end: adminFilters.customRange.end.getTime() + 86400000 - 1
          };
        }
        return { start: today.getTime(), end: now.getTime() };
      default:
        return { start: today.getTime(), end: now.getTime() };
    }
  };

  const sessionRows = useMemo<WorkSessionRow[]>(() => {
    const { start, end } = getDateRange();
    
    // Filtrar sessões e demandas do período
    let filteredSessions = workSessions.filter(s => s.timestamp >= start && s.timestamp <= end);
    let filteredDemands = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    
    // Filtrar apenas sessões após 6h da manhã
    filteredSessions = filteredSessions.filter(session => {
      const sessionDate = new Date(session.timestamp);
      const sessionHour = sessionDate.getHours();
      return sessionHour >= 6; // Só considerar sessões após 6h
    });
    
    if (adminFilters.designerId !== 'all') {
      filteredSessions = filteredSessions.filter(s => s.userId === adminFilters.designerId);
      filteredDemands = filteredDemands.filter(d => d.userId === adminFilters.designerId);
    }

    const uniqueSessions = new Map<string, typeof filteredSessions[0]>();
    filteredSessions.forEach(session => {
      const sessionDate = new Date(session.timestamp);
      sessionDate.setHours(0, 0, 0, 0);
      const key = `${session.userId}-${sessionDate.getTime()}`;
      
      const existing = uniqueSessions.get(key);
      if (!existing || session.timestamp < existing.timestamp) {
        uniqueSessions.set(key, session);
      }
    });

    return Array.from(uniqueSessions.values()).map(session => {
      const user = users.find(u => u.id === session.userId);
      const sessionDate = new Date(session.timestamp);
      sessionDate.setHours(0, 0, 0, 0);
      const nextDay = new Date(sessionDate);
      nextDay.setDate(nextDay.getDate() + 1);

      // Filtrar demandas apenas após 6h do dia
      const dayStart = new Date(sessionDate);
      dayStart.setHours(6, 0, 0, 0); // Início do dia útil: 6h

      const dayDemands = filteredDemands.filter(d => 
        d.userId === session.userId && 
        d.timestamp >= dayStart.getTime() && 
        d.timestamp < nextDay.getTime()
      );

      const totalArts = dayDemands.reduce((acc, d) => acc + d.totalQuantity, 0);
      const totalPoints = dayDemands.reduce((acc, d) => acc + d.totalPoints, 0);

      return {
        id: session.id,
        userId: session.userId,
        userName: user?.name || 'Desconhecido',
        date: sessionDate.toLocaleDateString('pt-BR'),
        startTime: new Date(session.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        totalArts,
        totalPoints,
        timestamp: session.timestamp
      };
    }).sort((a, b) => b.timestamp - a.timestamp);
  }, [workSessions, demands, users, adminFilters, customStartDate, customEndDate]);

  const filteredDemands = useMemo(() => {
    const { start, end } = getDateRange();
    let filtered = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    
    if (adminFilters.designerId !== 'all') {
      filtered = filtered.filter(d => d.userId === adminFilters.designerId);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [demands, adminFilters, customStartDate, customEndDate]);

  // Calcular soma total de artes do período selecionado
  const totalArts = useMemo(() => {
    return filteredDemands.reduce((acc, d) => acc + d.totalQuantity, 0);
  }, [filteredDemands]);

  // Função para formatar data para input
  const formatDateForInput = (timestamp: number): string => {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calcular estatísticas do período
  const stats = useMemo(() => {
    const totalPoints = filteredDemands.reduce((acc, d) => acc + d.totalPoints, 0);
    const totalDemands = filteredDemands.length;
    const uniqueDesigners = new Set(filteredDemands.map(d => d.userId)).size;
    const avgPointsPerDemand = totalDemands > 0 ? Math.round(totalPoints / totalDemands) : 0;
    
    return { totalPoints, totalDemands, uniqueDesigners, avgPointsPerDemand };
  }, [filteredDemands]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Registro de expedientes e demandas
          </p>
        </div>
        
        {/* Filtros em card organizado */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Modo de visualização */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Visualização
              </label>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('sessions')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'sessions'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Expedientes
                </button>
                <button
                  onClick={() => setViewMode('demands')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'demands'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Demandas
                </button>
                <button
                  onClick={() => setViewMode('charts')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === 'charts'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  Gráficos
                </button>
              </div>
            </div>

            {/* Filtro de período */}
            <div className="flex-1 min-w-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Período
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 min-w-[180px]">
                  <select
                    value={adminFilters.period}
                    onChange={(e) => {
                      const period = e.target.value as TimeFilter;
                      setAdminFilters({ ...adminFilters, period, customRange: undefined });
                      if (period !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }
                    }}
                    className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 text-sm font-medium text-slate-900 dark:text-white"
                  >
                    <option value="today">Hoje</option>
                    <option value="yesterday">Ontem</option>
                    <option value="weekly">Esta Semana</option>
                    <option value="monthly">Este Mês</option>
                    <option value="yearly">Este Ano</option>
                    <option value="custom">Personalizado</option>
                  </select>
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                </div>

                {adminFilters.period === 'custom' && (
                  <>
                    <DatePicker
                      value={customStartDate || formatDateForInput(getDateRange().start)}
                      onChange={(selectedDate) => {
                        setCustomStartDate(selectedDate);
                        if (!customEndDate || selectedDate > customEndDate) {
                          setCustomEndDate(selectedDate);
                        }
                      }}
                      max={customEndDate || undefined}
                      title="Data inicial"
                      placeholder="Data inicial"
                    />
                    <span className="text-slate-400 dark:text-slate-500 font-medium text-sm px-1">até</span>
                    <DatePicker
                      value={customEndDate || formatDateForInput(getDateRange().end)}
                      onChange={(selectedDate) => {
                        setCustomEndDate(selectedDate);
                        if (selectedDate < customStartDate) {
                          setCustomStartDate(selectedDate);
                        }
                      }}
                      min={customStartDate || undefined}
                      title="Data final"
                      placeholder="Data final"
                    />
                    {(customStartDate || customEndDate) && (
                      <button
                        onClick={() => {
                          setCustomStartDate('');
                          setCustomEndDate('');
                        }}
                        className="px-3 py-2.5 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all duration-200"
                        title="Limpar seleção"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Filtro de designer */}
            <div className="flex-shrink-0">
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Designer
              </label>
              <div className="relative min-w-[200px]">
                <select
                  value={adminFilters.designerId}
                  onChange={(e) => setAdminFilters({ ...adminFilters, designerId: e.target.value })}
                  className="w-full pl-10 pr-8 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600 outline-none transition-all duration-200 hover:border-slate-300 dark:hover:border-slate-600 text-sm font-medium text-slate-900 dark:text-white"
                >
                  <option value="all">Todos Designers</option>
                  {designers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none" size={16} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cards de estatísticas */}
      {(viewMode === 'sessions' || viewMode === 'demands') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Artes</span>
              <Filter className="text-slate-400 dark:text-slate-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-brand-600 dark:text-white">{totalArts}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Total de Pontos</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">pts</span>
            </div>
            <p className="text-3xl font-bold text-brand-600 dark:text-white">{stats.totalPoints}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Demandas</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">registros</span>
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.totalDemands}</p>
          </div>
          
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Designers Ativos</span>
              <Users className="text-slate-400 dark:text-slate-500" size={18} />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.uniqueDesigners}</p>
          </div>
        </div>
      )}

      {viewMode === 'charts' ? (
        <HistoryCharts demands={demands} designers={designers} />
      ) : viewMode === 'sessions' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Expedientes</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {sessionRows.length} {sessionRows.length === 1 ? 'expediente encontrado' : 'expedientes encontrados'}
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Designer</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Início</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Artes</th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sessionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Clock className="text-slate-300 dark:text-slate-600" size={48} />
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhum registro encontrado</p>
                        <p className="text-sm text-slate-400 dark:text-slate-500">Tente ajustar os filtros acima</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  sessionRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0"
                            style={{ 
                              backgroundColor: designers.find(d => d.id === row.userId)?.avatarColor || '#4F46E5' 
                            }}
                          >
                            {row.userName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-slate-900 dark:text-white font-medium">{row.userName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.date}</td>
                      <td className="px-6 py-4">
                        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                          <Clock size={14} className="text-slate-400 dark:text-slate-500" />
                          {row.startTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[2.5rem] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-sm">
                          {row.totalArts}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="inline-flex items-center justify-center min-w-[3rem] px-2.5 py-1 rounded-lg bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-bold text-sm">
                          {row.totalPoints}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Demandas</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {filteredDemands.length} {filteredDemands.length === 1 ? 'demanda encontrada' : 'demandas encontradas'}
            </p>
          </div>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {filteredDemands.length === 0 ? (
              <div className="p-16 text-center">
                <div className="flex flex-col items-center gap-3">
                  <Filter className="text-slate-300 dark:text-slate-600" size={48} />
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Nenhuma demanda encontrada</p>
                  <p className="text-sm text-slate-400 dark:text-slate-500">Tente ajustar os filtros acima</p>
                </div>
              </div>
            ) : (
              filteredDemands.map(demand => (
                <div key={demand.id} className="p-5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-3">
                        <div 
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0"
                          style={{ 
                            backgroundColor: designers.find(d => d.id === demand.userId)?.avatarColor || '#4F46E5' 
                          }}
                        >
                          {demand.userName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 dark:text-white">{demand.userName}</p>
                            {demand.executionCode && (
                              <span className="px-2 py-0.5 bg-brand-100 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 rounded text-xs font-semibold">
                                {demand.executionCode}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                            <Clock size={12} />
                            {formatDateTime(demand.timestamp)}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {demand.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                          >
                            {item.quantity}x {item.artTypeLabel}
                            {item.variationQuantity ? (
                              <span className="ml-1.5 text-brand-600 dark:text-brand-400">
                                (+{item.variationQuantity} var)
                              </span>
                            ) : ''}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex-shrink-0 flex items-center gap-3">
                      <div className="text-right">
                        <div className="inline-flex flex-col items-end gap-1 px-4 py-2.5 bg-brand-50 dark:bg-brand-900/20 rounded-lg border border-brand-200 dark:border-brand-800">
                          <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">{demand.totalPoints}</p>
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">pontos</p>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                          {demand.totalQuantity} {demand.totalQuantity === 1 ? 'arte' : 'artes'}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          if (window.confirm(`Tem certeza que deseja excluir esta demanda de ${demand.userName}?`)) {
                            setDeletingId(demand.id);
                            try {
                              await deleteDemand(demand.id);
                              await refreshData();
                            } catch (error) {
                              console.error('Erro ao excluir demanda:', error);
                              alert('Erro ao excluir demanda. Tente novamente.');
                            } finally {
                              setDeletingId(null);
                            }
                          }
                        }}
                        disabled={deletingId === demand.id}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Excluir demanda"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

