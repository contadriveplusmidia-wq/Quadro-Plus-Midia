import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Calendar, Clock, ChevronDown, Users, Filter } from 'lucide-react';
import { TimeFilter, WorkSessionRow } from '../types';

export const AdminHistory: React.FC = () => {
  const { users, demands, workSessions, adminFilters, setAdminFilters } = useApp();
  const [viewMode, setViewMode] = useState<'sessions' | 'demands'>('sessions');

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);

  const getDateRange = (): { start: number; end: number } => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (adminFilters.period) {
      case 'today':
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
    
    let filteredSessions = workSessions.filter(s => s.timestamp >= start && s.timestamp <= end);
    let filteredDemands = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    
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

      const dayDemands = filteredDemands.filter(d => 
        d.userId === session.userId && 
        d.timestamp >= sessionDate.getTime() && 
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
  }, [workSessions, demands, users, adminFilters]);

  const filteredDemands = useMemo(() => {
    const { start, end } = getDateRange();
    let filtered = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    
    if (adminFilters.designerId !== 'all') {
      filtered = filtered.filter(d => d.userId === adminFilters.designerId);
    }
    
    return filtered.sort((a, b) => b.timestamp - a.timestamp);
  }, [demands, adminFilters]);

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Histórico</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Registro de expedientes e demandas
          </p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setViewMode('sessions')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'sessions'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Expedientes
            </button>
            <button
              onClick={() => setViewMode('demands')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'demands'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Demandas
            </button>
          </div>

          <div className="relative">
            <select
              value={adminFilters.period}
              onChange={(e) => setAdminFilters({ ...adminFilters, period: e.target.value as TimeFilter })}
              className="pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-brand-600 outline-none"
            >
              <option value="today">Hoje</option>
              <option value="yesterday">Ontem</option>
              <option value="weekly">Esta Semana</option>
              <option value="monthly">Este Mês</option>
              <option value="yearly">Este Ano</option>
              <option value="custom">Personalizado</option>
            </select>
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>

          <div className="relative">
            <select
              value={adminFilters.designerId}
              onChange={(e) => setAdminFilters({ ...adminFilters, designerId: e.target.value })}
              className="pl-10 pr-8 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-brand-600 outline-none"
            >
              <option value="all">Todos Designers</option>
              {designers.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          </div>
        </div>
      </div>

      {viewMode === 'sessions' ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Designer</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Data</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 dark:text-slate-300">Início</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Artes</th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-slate-700 dark:text-slate-300">Pontos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {sessionRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                      Nenhum registro encontrado
                    </td>
                  </tr>
                ) : (
                  sessionRows.map(row => (
                    <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-900 dark:text-white font-medium">{row.userName}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">{row.date}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-400">
                        <span className="flex items-center gap-2">
                          <Clock size={16} />
                          {row.startTime}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-slate-900 dark:text-white font-semibold">{row.totalArts}</td>
                      <td className="px-6 py-4 text-right text-brand-600 font-bold">{row.totalPoints}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {filteredDemands.length === 0 ? (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400">
              Nenhuma demanda encontrada
            </div>
          ) : (
            filteredDemands.map(demand => (
              <div key={demand.id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-slate-900 dark:text-white">{demand.userName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                      {formatDateTime(demand.timestamp)}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {demand.items.map((item, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-300"
                        >
                          {item.quantity}x {item.artTypeLabel}
                          {item.variationQuantity ? ` (+${item.variationQuantity} var)` : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-brand-600">{demand.totalPoints} pts</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{demand.totalQuantity} artes</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
