import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { Filter, Award, Calendar, TrendingUp, BarChart3, Users, ChevronDown } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

type ChartMode = 'somaPoints' | 'somaArts' | 'mediaPoints' | 'mediaArts';
type DateFilterType = 'hoje' | 'semana' | 'mes' | 'custom';

export const AdminDashboard: React.FC = () => {
  const { users, demands, artTypes } = useApp();
  const [selectedDesigner, setSelectedDesigner] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<DateFilterType>('semana');
  const [chartMode, setChartMode] = useState<ChartMode>('somaPoints');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

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
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(today);
    todayEnd.setHours(23, 59, 59, 999);
    
    switch (dateFilter) {
      case 'hoje':
        return { start: today.getTime(), end: todayEnd.getTime() };
      case 'semana': {
        const dayOfWeek = today.getDay();
        const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const weekStart = new Date(today);
        weekStart.setDate(weekStart.getDate() - diff);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        return { start: weekStart.getTime(), end: weekEnd.getTime() };
      }
      case 'mes': {
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        return { start: monthStart.getTime(), end: monthEnd.getTime() };
      }
      case 'custom': {
        if (customStartDate && customEndDate) {
          const start = new Date(customStartDate).getTime();
          const endDate = new Date(customEndDate);
          endDate.setHours(23, 59, 59, 999);
          return { start, end: endDate.getTime() };
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
      if (day !== 0) count++;
      current.setDate(current.getDate() + 1);
    }
    return count || 1;
  };

  const filteredDemands = useMemo(() => {
    const { start, end } = getDateRange();
    let filtered = demands.filter(d => d.timestamp >= start && d.timestamp <= end);
    if (selectedDesigner !== 'all') {
      filtered = filtered.filter(d => d.userId === selectedDesigner);
    }
    return filtered;
  }, [demands, selectedDesigner, dateFilter, customStartDate, customEndDate]);

  const stats = useMemo(() => {
    const totalPoints = filteredDemands.reduce((acc, d) => acc + d.totalPoints, 0);
    const totalArts = filteredDemands.reduce((acc, d) => acc + d.totalQuantity, 0);
    const totalDemands = filteredDemands.length;

    const designerPoints: Record<string, { name: string; points: number }> = {};
    filteredDemands.forEach(d => {
      if (!designerPoints[d.userId]) {
        const designer = designers.find(des => des.id === d.userId);
        designerPoints[d.userId] = { 
          name: designer?.name.split(' - ')[1] || designer?.name || 'Designer',
          points: 0 
        };
      }
      designerPoints[d.userId].points += d.totalPoints;
    });

    let topPerformer = { name: '-', points: 0 };
    Object.values(designerPoints).forEach(dp => {
      if (dp.points > topPerformer.points) {
        topPerformer = dp;
      }
    });

    return { totalPoints, totalArts, totalDemands, topPerformer };
  }, [filteredDemands, designers]);

  const chartData = useMemo(() => {
    const { start, end } = getDateRange();
    const workingDays = getWorkingDaysInRange(start, end);

    return designers.map(designer => {
      const designerDemands = filteredDemands.filter(d => d.userId === designer.id);
      const points = designerDemands.reduce((acc, d) => acc + d.totalPoints, 0);
      const arts = designerDemands.reduce((acc, d) => acc + d.totalQuantity, 0);
      const avgPoints = Math.round(points / workingDays);
      const avgArts = Math.round((arts / workingDays) * 10) / 10;
      
      return {
        name: designer.name.split(' - ')[1] || designer.name,
        fullName: designer.name,
        points,
        arts,
        avgPoints,
        avgArts,
        color: getDesignerColor(designer.id)
      };
    }).filter(d => d.points > 0 || d.arts > 0);
  }, [designers, filteredDemands, dateFilter, customStartDate, customEndDate]);

  const pieData = useMemo(() => {
    return chartData.map(d => ({
      name: d.name,
      value: d.points,
      color: d.color
    }));
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
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="text-brand-600" size={20} />
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Visao Geral</h2>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-6">
          <div className="flex-shrink-0">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Designer</label>
            <div className="relative">
              <select
                value={selectedDesigner}
                onChange={(e) => setSelectedDesigner(e.target.value)}
                className="w-full lg:w-56 pl-3 pr-8 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none focus:ring-2 focus:ring-brand-600 outline-none text-sm"
              >
                <option value="all">Todos os Designers</option>
                {designers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            </div>
          </div>

          <div className="flex-1">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1 uppercase tracking-wide">Data esta entre</label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setDateFilter('hoje')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
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
                  onClick={() => setDateFilter('mes')}
                  className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    dateFilter === 'mes'
                      ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  Mes
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="date"
                    value={customStartDate || formatDateForInput(start)}
                    onChange={(e) => {
                      setCustomStartDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="pl-3 pr-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
                <span className="text-slate-400">→</span>
                <div className="relative">
                  <input
                    type="date"
                    value={customEndDate || formatDateForInput(end)}
                    onChange={(e) => {
                      setCustomEndDate(e.target.value);
                      setDateFilter('custom');
                    }}
                    className="pl-3 pr-2 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-xl p-5 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide">Pontos Totais</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalPoints}</p>
              </div>
              <div className="p-2 bg-blue-200 dark:bg-blue-800 rounded-lg">
                <Award className="text-blue-600 dark:text-blue-400" size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Artes Feitas</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalArts}</p>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <Calendar className="text-slate-500 dark:text-slate-400" size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Demandas</p>
                <p className="text-3xl font-bold text-slate-900 dark:text-white mt-2">{stats.totalDemands}</p>
              </div>
              <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                <TrendingUp className="text-slate-500 dark:text-slate-400" size={22} />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-xl p-5 border border-slate-200 dark:border-slate-700">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Top Performance</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 truncate">{stats.topPerformer.name}</p>
                <p className="text-sm font-medium text-green-600 dark:text-green-400">+{stats.topPerformer.points} pts</p>
              </div>
              <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                <Users className="text-amber-600 dark:text-amber-400" size={22} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="text-slate-400" size={20} />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Produtividade por Designer
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {workingDays} dia(s) considerado(s) para a media (Seg-Sab).
            </p>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <button
              onClick={() => setChartMode('somaPoints')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartMode === 'somaPoints'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soma Pontos
            </button>
            <button
              onClick={() => setChartMode('somaArts')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartMode === 'somaArts'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Soma Artes
            </button>
            <button
              onClick={() => setChartMode('mediaPoints')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartMode === 'mediaPoints'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Media Pontos
            </button>
            <button
              onClick={() => setChartMode('mediaArts')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                chartMode === 'mediaArts'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Media Artes
            </button>
          </div>
        </div>

        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={chartData} barCategoryGap="20%">
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fill: '#64748b', fontSize: 12 }} 
                axisLine={false}
                tickLine={false}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1e293b',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff'
                }}
                itemStyle={{
                  color: '#fff'
                }}
                labelStyle={{
                  color: '#fff',
                  fontWeight: 'bold'
                }}
                formatter={(value: number) => [
                  chartMode.startsWith('media') ? value.toFixed(1) : value,
                  chartMode.endsWith('Points') ? 'Pontos' : 'Artes'
                ]}
              />
              <Bar 
                dataKey={getChartDataKey()} 
                radius={[6, 6, 0, 0]}
                maxBarSize={80}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[350px] flex items-center justify-center text-slate-500">
            Sem dados para o periodo selecionado
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Distribuicao de Pontos
          </h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
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
                    contentStyle={{ 
                      backgroundColor: '#1e293b',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff'
                    }}
                    itemStyle={{
                      color: '#fff'
                    }}
                    labelStyle={{
                      color: '#fff',
                      fontWeight: 'bold'
                    }}
                    formatter={(value: number) => [`${value} pts`, 'Pontos']}
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
                    artTypeStats[item.artTypeId].quantity += item.quantity;
                    artTypeStats[item.artTypeId].points += item.totalPoints;
                  });
                });
                const sorted = Object.values(artTypeStats).sort((a, b) => b.points - a.points);
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
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
