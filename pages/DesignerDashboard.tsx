import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Plus, Minus, Clock, Zap, TrendingUp, Trash2, ClipboardList, Target, CheckCircle, AlertTriangle, Edit2, X } from 'lucide-react';
import { DemandItem, DailyPerformanceResult, PerformanceStatus, Demand } from '../types';
import { autoFocus } from '../utils/autoFocus';

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
      bg: 'bg-[#280FFF]',
      bgDark: 'bg-[#280FFF]/10',
      border: 'border-[#280FFF]',
      borderDark: 'border-[#280FFF]/30',
      text: 'text-white',
      textDark: 'text-white',
      accent: 'text-white/90',
      accentDark: 'text-slate-300'
    };
  }
  
  return { status, percentage, message, colors };
};

export const DesignerDashboard: React.FC = () => {
  const { currentUser, artTypes, demands, addDemand, updateDemand, deleteDemand, startWorkSession, getTodaySession, settings } = useApp();
  const [items, setItems] = useState<DemandItem[]>([]);
  const [selectedArtType, setSelectedArtType] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [variationQty, setVariationQty] = useState(0);
  const [editingDemand, setEditingDemand] = useState<Demand | null>(null);
  const [editItems, setEditItems] = useState<DemandItem[]>([]);

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

  // Calcular status de performance usando meta configurável
  const dailyGoal = settings.dailyArtGoal || 8;
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

  const formRef = useRef<HTMLDivElement>(null);

  // AutoFocus quando a página carregar (para o formulário de nova demanda)
  useEffect(() => {
    if (formRef.current) {
      autoFocus(formRef.current, 300);
    }
  }, []);

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
      <div className="flex items-center gap-4 mb-2">
        <div 
          className="w-14 h-14 rounded-full flex items-center justify-center text-white font-semibold text-base shadow-md"
          style={{ backgroundColor: getAvatarBg() }}
        >
          {currentUser ? getInitials(currentUser.name) : 'U'}
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white mb-1">
            Olá, {currentUser?.name?.split(' - ')[1] || currentUser?.name?.split(' ')[0]}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm">
            {dayName}, {dateStr}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card dinâmico de Performance do Dia */}
        <div className={`rounded-2xl p-4 sm:p-5 relative overflow-hidden transition-all duration-300 shadow-sm flex flex-col ${
          isDark 
            ? `${performanceStatus.colors.bgDark} border ${performanceStatus.colors.borderDark}` 
            : `bg-gradient-to-br ${
                performanceStatus.status === 'success' ? 'from-green-500 to-green-600' :
                performanceStatus.status === 'warning' ? 'from-yellow-400 to-yellow-500' :
                'from-[#280FFF] to-[#1F0BFF]'
              }`
        }`}>
          <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-8 -mt-8 ${
            isDark ? 'bg-white/5' : 'bg-white/10'
          }`}></div>
          <div className={`absolute bottom-0 left-0 w-16 h-16 rounded-full -ml-6 -mb-6 ${
            isDark ? 'bg-white/3' : 'bg-white/5'
          }`}></div>
          
          <div className="relative flex-1 flex flex-col">
            <div className={`flex items-center gap-2 text-xs sm:text-sm mb-3 ${
              isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
            }`}>
              {performanceStatus.status === 'success' ? <CheckCircle size={14} /> :
               performanceStatus.status === 'warning' ? <AlertTriangle size={14} /> :
               <Zap size={14} />}
              <span className="uppercase tracking-wider font-medium">Performance do Dia</span>
            </div>
            
            {totalArtsToday >= dailyGoal && (
              <div className="flex items-baseline gap-2 mb-4">
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>{totalPointsToday}</div>
                <div className={`text-xs sm:text-sm ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>Pontos totais</div>
              </div>
            )}
            
            <div className={`border-t ${
              isDark ? 'border-white/10' : 'border-white/20'
            } mb-4 pt-4`}></div>
            
            <div className="flex gap-6 sm:gap-8 lg:gap-10 mb-3">
              <div>
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>{totalArtsToday}</div>
                <div className={`text-sm uppercase ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>Artes</div>
              </div>
              <div>
                <div className={`text-4xl sm:text-5xl lg:text-6xl font-bold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>{todayDemands.length}</div>
                <div className={`text-sm uppercase ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>Demandas</div>
              </div>
            </div>
            
            <div className={`mt-auto flex items-center gap-2 sm:gap-3 rounded-lg p-2.5 sm:p-3 backdrop-blur-sm ${
              isDark ? 'bg-white/10' : 'bg-white/20'
            }`}>
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center backdrop-blur-sm flex-shrink-0 ${
                isDark ? 'bg-white/10' : 'bg-white/30'
              }`}>
                <Target size={16} className={isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text} />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-xs sm:text-sm font-semibold ${
                  isDark ? performanceStatus.colors.textDark : performanceStatus.colors.text
                }`}>
                  Meta: {totalArtsToday}/{dailyGoal} artes ({performanceStatus.percentage}%)
                </div>
                <div className={`text-xs ${
                  isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
                }`}>{performanceStatus.message}</div>
              </div>
            </div>
            {totalArtsToday < dailyGoal && (
              <div className={`mt-2.5 text-xs text-left ${
                isDark ? performanceStatus.colors.accentDark : performanceStatus.colors.accent
              }`}>
                Bata a meta do dia para visualizar a pontuação total.
              </div>
            )}
          </div>
        </div>

        <div ref={formRef} className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
          <div className="flex items-center gap-2.5 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
            <ClipboardList className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Nova Demanda</h2>
          </div>

          <div className="mb-6">
            <label className="block text-xs text-slate-500 dark:text-slate-400 mb-3 uppercase tracking-wide">
              Tipo de Arte
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {artTypes.map(art => (
                <button
                  key={art.id}
                  onClick={() => setSelectedArtType(art.id)}
                  className={`px-4 py-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium text-center ${
                    selectedArtType === art.id
                      ? 'border-brand-600 bg-brand-50 dark:bg-slate-800 dark:border-slate-600 text-brand-600 dark:text-slate-300 shadow-sm'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-brand-400 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                  }`}
                >
                  {art.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">

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
                Variações
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

          {selectedArtType && (
            <div className="flex items-center justify-end mb-4">
              <button
                onClick={handleAddItem}
                className="flex items-center gap-2 px-4 py-2 border-2 border-dashed border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 rounded-xl hover:border-brand-600 hover:text-brand-600 dark:hover:border-slate-400 dark:hover:text-slate-300 transition-all duration-200 hover:bg-brand-50 dark:hover:bg-brand-900/10"
              >
                <Plus size={18} />
                Adicionar Item
              </button>
            </div>
          )}

          {items.length > 0 ? (
            <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
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
                    <button onClick={() => handleRemoveItem(idx)} className="text-red-400 hover:text-red-600">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 bg-brand-700 hover:bg-brand-800 text-white font-semibold transition-all duration-200 hover:shadow-lg hover:shadow-brand-700/30"
              >
                Registrar Demanda
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Clock className="text-slate-500 dark:text-slate-400" size={20} />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Histórico de Hoje</h2>
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {todayDemands.length} entrega{todayDemands.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horário</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Descrição</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Artes</th>
                <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {todaySession && (
                <tr className="text-slate-500 dark:text-slate-400">
                  <td className="px-6 py-4 text-sm">{formatTime(todaySession.timestamp)}</td>
                  <td className="px-6 py-4 text-sm flex items-center gap-2">
                    <Clock size={16} />
                    Início do Trabalho
                  </td>
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
                              +{item.variationQuantity} {item.variationQuantity === 1 ? 'variação' : 'variações'}
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
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => {
                          setEditingDemand(demand);
                          setEditItems([...demand.items]);
                        }}
                        className="text-slate-400 hover:text-brand-600 transition-colors"
                        title="Editar demanda"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => deleteDemand(demand.id)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                        title="Excluir demanda"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {todayDemands.length === 0 && !todaySession && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhuma demanda registrada hoje
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Edição de Demanda */}
      {editingDemand && (
        <div className="fixed inset-0 bg-black/50 dark:bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Editar Demanda</h3>
              <button
                onClick={() => {
                  setEditingDemand(null);
                  setEditItems([]);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {editItems.map((item, idx) => {
                const artType = artTypes.find(a => a.id === item.artTypeId);
                return (
                  <div key={idx} className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-medium text-slate-900 dark:text-white">{item.artTypeLabel}</span>
                      <button
                        onClick={() => {
                          const newItems = editItems.filter((_, i) => i !== idx);
                          setEditItems(newItems);
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Quantidade</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newItems = [...editItems];
                              if (newItems[idx].quantity > 1) {
                                newItems[idx].quantity -= 1;
                                newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + (newItems[idx].variationQuantity * (newItems[idx].variationPoints || 0));
                                setEditItems(newItems);
                              }
                            }}
                            className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[idx].quantity = Math.max(1, parseInt(e.target.value) || 1);
                              newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + (newItems[idx].variationQuantity * (newItems[idx].variationPoints || 0));
                              setEditItems(newItems);
                            }}
                            className="w-20 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-center text-sm font-medium text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              const newItems = [...editItems];
                              newItems[idx].quantity += 1;
                              newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + (newItems[idx].variationQuantity * (newItems[idx].variationPoints || 0));
                              setEditItems(newItems);
                            }}
                            className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">Variações</label>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const newItems = [...editItems];
                              if (newItems[idx].variationQuantity > 0) {
                                newItems[idx].variationQuantity -= 1;
                                newItems[idx].variationPoints = newItems[idx].variationQuantity * (settings.variationPoints || 5);
                                newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + newItems[idx].variationPoints;
                                setEditItems(newItems);
                              }
                            }}
                            className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Minus size={14} />
                          </button>
                          <input
                            type="number"
                            min="0"
                            value={item.variationQuantity || 0}
                            onChange={(e) => {
                              const newItems = [...editItems];
                              newItems[idx].variationQuantity = Math.max(0, parseInt(e.target.value) || 0);
                              newItems[idx].variationPoints = newItems[idx].variationQuantity * (settings.variationPoints || 5);
                              newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + newItems[idx].variationPoints;
                              setEditItems(newItems);
                            }}
                            className="w-20 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded text-center text-sm font-medium text-slate-900 dark:text-white"
                          />
                          <button
                            onClick={() => {
                              const newItems = [...editItems];
                              newItems[idx].variationQuantity = (newItems[idx].variationQuantity || 0) + 1;
                              newItems[idx].variationPoints = newItems[idx].variationQuantity * (settings.variationPoints || 5);
                              newItems[idx].totalPoints = (newItems[idx].quantity * newItems[idx].pointsPerUnit) + newItems[idx].variationPoints;
                              setEditItems(newItems);
                            }}
                            className="p-1.5 bg-white dark:bg-slate-700 rounded border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {editItems.length === 0 && (
                <div className="text-center py-8 text-slate-500 dark:text-slate-400">
                  Nenhum item na demanda. Adicione itens para salvar.
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={() => {
                    setEditingDemand(null);
                    setEditItems([]);
                  }}
                  className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    if (editItems.length === 0) {
                      alert('Adicione pelo menos um item para salvar a demanda.');
                      return;
                    }
                    // Variações não contam como artes, apenas como pontos
                    const totalQuantity = editItems.reduce((acc, item) => {
                      const isVariation = item.artTypeLabel.toLowerCase().includes('variação');
                      return acc + (isVariation ? 0 : item.quantity);
                    }, 0);
                    const totalPoints = editItems.reduce((acc, item) => acc + item.totalPoints, 0);
                    try {
                      await updateDemand(editingDemand.id, {
                        items: editItems,
                        totalQuantity,
                        totalPoints
                      });
                      setEditingDemand(null);
                      setEditItems([]);
                    } catch (error) {
                      alert('Erro ao atualizar demanda. Tente novamente.');
                    }
                  }}
                  className="flex-1 px-4 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
