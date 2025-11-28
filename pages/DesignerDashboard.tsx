import React, { useState, useEffect, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Minus, Clock, Zap, TrendingUp, Trash2, ClipboardList, Target, CheckCircle, AlertTriangle } from 'lucide-react';
import { DemandItem, DailyPerformanceResult, PerformanceStatus } from '../types';

// Função centralizada para calcular status de performance diária
const getDailyPerformanceStatus = (artsToday: number, dailyGoal: number): DailyPerformanceResult => {
  const goal = dailyGoal || 10;
  const percentage = Math.round((artsToday / goal) * 100);
  
  let status: PerformanceStatus;
  let message: string;
  let colors: DailyPerformanceResult['colors'];
  
  if (percentage >= 100) {
    status = 'success';
    message = 'Meta alcançada! Excelente trabalho!';
    colors = {
      bg: 'bg-green-500',
      bgDark: 'bg-green-500/20',
      border: 'border-green-500',
      borderDark: 'border-green-500/50',
      text: 'text-white',
      textDark: 'text-green-400',
      accent: 'text-green-200',
      accentDark: 'text-green-300'
    };
  } else if (percentage >= 70) {
    status = 'warning';
    message = 'Você está quase lá, continue!';
    colors = {
      bg: 'bg-yellow-400',
      bgDark: 'bg-yellow-400/20',
      border: 'border-yellow-400',
      borderDark: 'border-yellow-400/50',
      text: 'text-yellow-900',
      textDark: 'text-yellow-400',
      accent: 'text-yellow-700',
      accentDark: 'text-yellow-300'
    };
  } else {
    status = 'neutral';
    message = 'Continue produzindo!';
    colors = {
      bg: 'bg-indigo-600',
      bgDark: 'bg-indigo-600/20',
      border: 'border-indigo-600',
      borderDark: 'border-indigo-500/50',
      text: 'text-white',
      textDark: 'text-indigo-400',
      accent: 'text-indigo-200',
      accentDark: 'text-indigo-300'
    };
  }
  
  return { status, percentage, message, colors };
};

export const DesignerDashboard: React.FC = () => {
  const { currentUser, artTypes, demands, addDemand, deleteDemand, startWorkSession, getTodaySession, settings } = useApp();
  const [items, setItems] = useState<DemandItem[]>([]);
  const [selectedArtType, setSelectedArtType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [variationQty, setVariationQty] = useState(0);

  const todaySession = currentUser ? getTodaySession(currentUser.id) : undefined;
  
  useEffect(() => {
    if (currentUser && !todaySession) {
      startWorkSession(currentUser.id);
    }
  }, [currentUser, todaySession, startWorkSession]);

  const today = new Date();
  const dayName = today.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' });
  today.setHours(0, 0, 0, 0);
  
  const todayDemands = demands.filter(d => 
    d.userId === currentUser?.id && d.timestamp >= today.getTime()
  ).sort((a, b) => b.timestamp - a.timestamp);

  const totalArtsToday = todayDemands.reduce((acc, d) => acc + d.totalQuantity, 0);
  const totalPointsToday = todayDemands.reduce((acc, d) => acc + d.totalPoints, 0);

  // Calcular status de performance
  const dailyGoal = settings.dailyGoal || 10;
  const performanceStatus = useMemo(() => 
    getDailyPerformanceStatus(totalArtsToday, dailyGoal), 
    [totalArtsToday, dailyGoal]
  );

  // Detectar tema dark/light
  const [isDark, setIsDark] = useState(false);
  useEffect(() => {
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains('dark'));
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const selectedArt = artTypes.find(a => a.id === selectedArtType);
  const variationPoints = variationQty * (settings.variationPoints || 5);
  const subtotal = selectedArt ? (selectedArt.points * quantity) + variationPoints : 0;

  const handleAddItem = () => {
    if (!selectedArt) return;

    const itemPoints = (selectedArt.points * quantity) + variationPoints;

    const newItem: DemandItem = {
      artTypeId: selectedArt.id,
      artTypeLabel: selectedArt.label,
      pointsPerUnit: selectedArt.points,
      quantity,
      variationQuantity: variationQty,
      variationPoints,
      totalPoints: itemPoints
    };

    setItems([...items, newItem]);
    setSelectedArtType('');
    setQuantity(1);
    setVariationQty(0);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (items.length === 0 || !currentUser) return;

    const totalQuantity = items.reduce((acc, item) => {
      const isVariation = item.artTypeLabel.toLowerCase().includes('variação');
      return acc + (isVariation ? 0 : item.quantity);
    }, 0);
    
    const totalPoints = items.reduce((acc, item) => acc + item.totalPoints, 0);

    await addDemand({
      userId: currentUser.id,
      userName: currentUser.name,
      items,
      totalQuantity,
      totalPoints
    });

    setItems([]);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getAvatarBg = () => {
    if (currentUser?.avatarColor) return currentUser.avatarColor;
    const avatarUrl = currentUser?.avatarUrl || '';
    const bgMatch = avatarUrl.match(/background=([a-fA-F0-9]{6})/);
    if (bgMatch) return `#${bgMatch[1]}`;
    return '#4F46E5';
  };

  const getInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: getAvatarBg() }}
        >
          {currentUser ? getInitials(currentUser.name) : 'U'}
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Ola, {currentUser?.name?.split(' - ')[1] || currentUser?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {dayName}, {dateStr}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card dinâmico de Performance do Dia */}
        <div className={`rounded-2xl p-6 relative overflow-hidden transition-all duration-300 ${
          isDark 
            ? `${performanceStatus.colors.bgDark} border ${performanceStatus.colors.borderDark}` 
            : `bg-gradient-to-br ${
                performanceStatus.status === 'success' ? 'from-green-500 to-green-600' :
                performanceStatus.status === 'warning' ? 'from-yellow-400 to-yellow-500' :
                'from-indigo-600 to-indigo-700'
              }`
        }`}>
          <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-10 -mt-10 ${
            isDark ? 'bg-white/5' : 'bg-white/10'
          }`}></div>
          <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-8 -mb-8 ${
            isDark ? 'bg-white/3' : 'bg-white/5'
          }`}></div>
          
          <div className="relative">
            <div className={`flex items-center gap-2 text-sm mb-4 ${
              isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
            }`}>
              {performanceStatus.status === 'success' ? <CheckCircle size={16} /> :
               performanceStatus.status === 'warning' ? <AlertTriangle size={16} /> :
               <Zap size={16} />}
              <span className="uppercase tracking-wider font-medium">Performance do Dia</span>
            </div>
            
            <div className={`text-6xl font-bold mb-2 ${
              isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
            }`}>{totalPointsToday}</div>
            <div className={`mb-6 ${
              isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
            }`}>Pontos totais</div>
            
            <div className="flex gap-8">
              <div>
                <div className={`text-3xl font-bold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>{totalArtsToday}</div>
                <div className={`text-sm uppercase ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>Artes</div>
              </div>
              <div>
                <div className={`text-3xl font-bold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>{todayDemands.length}</div>
                <div className={`text-sm uppercase ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>Demandas</div>
              </div>
            </div>
            
            <div className={`mt-6 flex items-center gap-3 rounded-xl p-3 ${
              isDark ? 'bg-white/10' : 'bg-white/20'
            }`}>
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-white/10' : 'bg-white/30'
              }`}>
                <Target size={20} className={isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text} />
              </div>
              <div>
                <div className={`font-semibold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>
                  Meta: {totalArtsToday}/{dailyGoal} artes ({performanceStatus.percentage}%)
                </div>
                <div className={`text-sm ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>{performanceStatus.message}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
          <div className="flex items-center gap-2 mb-6">
            <ClipboardList className="text-slate-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nova Demanda</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Tipo de Arte
              </label>
              <select
                value={selectedArtType}
                onChange={(e) => setSelectedArtType(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-600 outline-none text-sm"
              >
                <option value="">Selecione...</option>
                {artTypes.map(art => (
                  <option key={art.id} value={art.id}>{art.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                QTD
              </label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button 
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full text-center py-2.5 bg-transparent outline-none text-sm"
                />
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide">
                Variacoes
              </label>
              <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg">
                <button 
                  onClick={() => setVariationQty(Math.max(0, variationQty - 1))}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="0"
                  value={variationQty}
                  onChange={(e) => setVariationQty(parseInt(e.target.value) || 0)}
                  className="w-full text-center py-2.5 bg-transparent outline-none text-sm"
                />
                <button 
                  onClick={() => setVariationQty(variationQty + 1)}
                  className="px-3 py-2.5 text-slate-400 hover:text-slate-600"
                >
                  <Plus size={16} />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-4">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 uppercase">Subtotal</span>
              <span className="ml-2 text-lg font-bold text-green-600">+{subtotal}</span>
            </div>
            <button
              onClick={handleAddItem}
              disabled={!selectedArtType}
              className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-lg hover:border-brand-600 hover:text-brand-600 disabled:opacity-50 transition-colors"
            >
              <Plus size={18} />
              Adicionar Item
            </button>
          </div>

          {items.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between border-b border-slate-200 dark:border-slate-700 last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-medium text-slate-900 dark:text-white">
                      {item.quantity}x {item.artTypeLabel}
                    </span>
                    {item.variationQuantity ? (
                      <span className="text-xs text-slate-500">(+{item.variationQuantity} var)</span>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-green-600">+{item.totalPoints}</span>
                    <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <div className="p-4 bg-brand-600 flex items-center justify-between">
                <span className="text-white font-medium">Total da Demanda</span>
                <span className="text-white font-bold text-lg">
                  {items.reduce((acc, i) => acc + i.totalPoints, 0)} pts
                </span>
              </div>
              <button
                onClick={handleSubmit}
                className="w-full py-3 bg-brand-700 hover:bg-brand-800 text-white font-semibold transition-colors"
              >
                Registrar Demanda
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center">
              <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center mx-auto mb-3">
                <ClipboardList className="text-slate-400" size={24} />
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Adicione itens para montar a demanda
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="text-slate-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Historico de Hoje</h2>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {todayDemands.length} entrega{todayDemands.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horario</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descricao</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Artes</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pontos</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Acao</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {todaySession && (
                <tr className="text-slate-500 dark:text-slate-400">
                  <td className="px-6 py-4 text-sm">{formatTime(todaySession.timestamp)}</td>
                  <td className="px-6 py-4 text-sm flex items-center gap-2">
                    <Clock size={16} />
                    Inicio do Trabalho
                  </td>
                  <td className="px-6 py-4 text-center">-</td>
                  <td className="px-6 py-4 text-center">-</td>
                  <td className="px-6 py-4 text-center">-</td>
                </tr>
              )}
              {todayDemands.map(demand => (
                <tr key={demand.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400">
                    {formatTime(demand.timestamp)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900 dark:text-white">
                      Entrega ({demand.items.length} {demand.items.length === 1 ? 'item' : 'itens'})
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {demand.items.map((item, idx) => (
                        <React.Fragment key={idx}>
                          <span 
                            className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs text-slate-600 dark:text-slate-400"
                          >
                            {item.quantity}x {item.artTypeLabel}
                          </span>
                          {item.variationQuantity > 0 && (
                            <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 rounded text-xs text-purple-600 dark:text-purple-400">
                              +{item.variationQuantity} {item.variationQuantity === 1 ? 'variacao' : 'variacoes'}
                            </span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-sm font-medium text-slate-900 dark:text-white">
                    {demand.totalQuantity}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-bold text-green-600">+{demand.totalPoints}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => deleteDemand(demand.id)}
                      className="text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {todayDemands.length === 0 && !todaySession && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma demanda registrada hoje
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
