import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

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

interface AwardsChartData {
  name: string;
  totalPoints: number;
  color: string;
}

interface AwardsChartProps {
  data: AwardsChartData[];
}

export const AwardsChart: React.FC<AwardsChartProps> = ({ data }) => {
  const [isDark, setIsDark] = useState(false);

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

  // Dados formatados para o gráfico
  const chartData = useMemo(() => {
    return data.map(item => ({
      name: item.name,
      pontos: item.totalPoints,
      color: item.color
    }));
  }, [data]);

  if (chartData.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="text-slate-400" size={20} />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Pontos do Mês Atual
          </h3>
        </div>
        <div className="h-[350px] flex items-center justify-center text-slate-500 dark:text-slate-400">
          Sem dados para o período selecionado
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="text-slate-400" size={20} />
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Pontos do Mês Atual
        </h3>
      </div>
      <ResponsiveContainer width="100%" height={350}>
        <BarChart data={chartData} barCategoryGap="20%">
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
            label={{ value: 'Pontos', angle: -90, position: 'insideLeft', fill: tickColor, fontSize: 12 }}
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
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};


