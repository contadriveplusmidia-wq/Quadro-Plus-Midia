import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Trophy, X, Trash2, Calendar, Upload, Crown, Star, AlertCircle, MessageSquare, Image, BarChart3, Save } from 'lucide-react';

const MONTHS = [
  { value: 'Janeiro', label: 'Janeiro' },
  { value: 'Fevereiro', label: 'Fevereiro' },
  { value: 'Março', label: 'Março' },
  { value: 'Abril', label: 'Abril' },
  { value: 'Maio', label: 'Maio' },
  { value: 'Junho', label: 'Junho' },
  { value: 'Julho', label: 'Julho' },
  { value: 'Agosto', label: 'Agosto' },
  { value: 'Setembro', label: 'Setembro' },
  { value: 'Outubro', label: 'Outubro' },
  { value: 'Novembro', label: 'Novembro' },
  { value: 'Dezembro', label: 'Dezembro' },
];

export const AdminPremiacoes: React.FC = () => {
  const { users, awards, addAward, deleteAward, settings, updateSettings, resetAwardsUpdates } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Configurações de premiação
  const [motivationalMessage, setMotivationalMessage] = useState(settings.motivationalMessage || '');
  const [motivationalMessageEnabled, setMotivationalMessageEnabled] = useState(settings.motivationalMessageEnabled || false);
  const [nextAwardImage, setNextAwardImage] = useState(settings.nextAwardImage || '');
  const [chartEnabled, setChartEnabled] = useState(settings.chartEnabled !== undefined ? settings.chartEnabled : true);
  const [showAwardsChart, setShowAwardsChart] = useState(settings.showAwardsChart || false);
  const [savingSettings, setSavingSettings] = useState(false);

  const designers = users.filter(u => u.role === 'DESIGNER' && u.active);
  const currentYear = new Date().getFullYear();

  // Resetar flag de atualizações quando a página for acessada
  useEffect(() => {
    if (settings?.awardsHasUpdates === true) {
      resetAwardsUpdates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Executar apenas uma vez quando o componente montar

  // Carregar configurações quando settings mudarem
  useEffect(() => {
    setMotivationalMessage(settings.motivationalMessage || '');
    setMotivationalMessageEnabled(settings.motivationalMessageEnabled || false);
    setNextAwardImage(settings.nextAwardImage || '');
    setChartEnabled(settings.chartEnabled !== undefined ? settings.chartEnabled : true);
    setShowAwardsChart(settings.showAwardsChart || false);
  }, [settings]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limitar tamanho da imagem (max 500KB para base64)
    if (file.size > 500000) {
      setError('Imagem muito grande. Use uma imagem menor que 500KB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setImageUrl(reader.result as string);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleNextAwardImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1000000) {
      alert('Imagem muito grande. Use uma imagem menor que 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setNextAwardImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await updateSettings({
        motivationalMessage,
        motivationalMessageEnabled,
        nextAwardImage,
        chartEnabled,
        showAwardsChart
      });
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedDesigner || !selectedMonth) {
      setError('Selecione o designer e o mês');
      return;
    }

    const designer = designers.find(d => d.id === selectedDesigner);
    if (!designer) {
      setError('Designer não encontrado');
      return;
    }

    setError('');
    setSaving(true);

    try {
      const result = await addAward({
        designerId: selectedDesigner,
        designerName: designer.name,
        month: selectedMonth,
        description: description || '',
        imageUrl: imageUrl || undefined
      });

      if (result.success) {
        setShowModal(false);
        resetForm();
      } else {
        setError(result.error || 'Erro ao salvar premiação. Verifique se a tabela awards existe no banco de dados.');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar premiação. Tente novamente.');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir esta premiação?')) {
      await deleteAward(id);
    }
  };

  const resetForm = () => {
    setSelectedDesigner('');
    setSelectedMonth('');
    setDescription('');
    setImageUrl('');
    setError('');
  };

  const getDesignerColor = (designerId: string) => {
    const designer = users.find(u => u.id === designerId);
    return designer?.avatarColor || '#4F46E5';
  };

  const getDesignerInitials = (name: string) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Premiações</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gerencie os vencedores mensais
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
        >
          <Crown size={20} />
          <span>Nova Premiação</span>
        </button>
      </div>

      {/* Configurações de Premiação */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Crown className="text-amber-500" size={20} />
          Configurações de Premiação
        </h2>

        <div className="space-y-6">
          {/* Mensagem Motivacional */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Mensagem Motivacional
              </label>
              <button
                onClick={() => {
                  setMotivationalMessageEnabled(!motivationalMessageEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  motivationalMessageEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    motivationalMessageEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <textarea
              value={motivationalMessage}
              onChange={(e) => setMotivationalMessage(e.target.value)}
              rows={3}
              disabled={!motivationalMessageEnabled}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="Ex: Parabéns aos vencedores! Continue se esforçando para alcançar seus objetivos!"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esta mensagem aparecerá no topo da página de premiações dos designers
            </p>
          </div>

          {/* Imagem da Próxima Premiação */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
              Imagem Grande da Próxima Premiação
            </label>
            <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors overflow-hidden">
              {nextAwardImage ? (
                <img src={nextAwardImage} alt="Preview" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Image className="text-slate-400 mb-2" size={40} />
                  <span className="text-sm text-slate-500">Clique para fazer upload</span>
                  <span className="text-xs text-slate-400 mt-1">Máx. 1MB</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                onChange={handleNextAwardImageUpload}
                className="hidden"
              />
            </label>
            {nextAwardImage && (
              <button
                type="button"
                onClick={() => setNextAwardImage('')}
                className="mt-2 text-xs text-red-500 hover:text-red-600"
              >
                Remover imagem
              </button>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Esta imagem será exibida em destaque na página de premiações dos designers
            </p>
          </div>

          {/* Ativar/Desativar Gráfico no Painel do Designer */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Exibir Gráfico no Painel do Designer
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mostra um mini-gráfico com os pontos do mês atual
                </p>
              </div>
              <button
                onClick={() => {
                  setChartEnabled(!chartEnabled);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  chartEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    chartEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Ativar/Desativar Gráfico de Premiações */}
          <div>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Exibir Gráfico de Pontos na Página de Premiações
                </label>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Mostra um gráfico com a soma de pontos de cada designer no mês atual
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAwardsChart(!showAwardsChart);
                }}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showAwardsChart ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showAwardsChart ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Botão Salvar Configurações */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Save size={18} />
              {savingSettings ? 'Salvando...' : 'Salvar Configurações'}
            </button>
          </div>
        </div>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900/20 dark:to-amber-800/20 rounded-2xl p-5 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-200 dark:bg-amber-800 rounded-xl">
              <Trophy className="text-amber-600 dark:text-amber-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{awards.length}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Total de Premiações</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Star className="text-slate-500 dark:text-slate-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {new Set(awards.map(a => a.designerId)).size}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Designers Premiados</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <Calendar className="text-slate-500 dark:text-slate-400" size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">
                {currentYear}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">Ano Atual</p>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de premiações */}
      {awards.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
          <Trophy className="mx-auto text-slate-300 dark:text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-900 dark:text-white mb-2">
            Nenhuma premiação cadastrada
          </h3>
          <p className="text-slate-500 dark:text-slate-400">
            Clique no botão acima para adicionar a primeira premiação
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {awards.map(award => (
            <div
              key={award.id}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden group"
            >
              {award.imageUrl ? (
                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative">
                  <img 
                    src={award.imageUrl} 
                    alt={award.description} 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Trophy className="text-amber-400" size={20} />
                    <span className="text-white font-medium text-sm">
                      {award.month}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="h-40 bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center relative">
                  <Trophy className="text-white/30" size={64} />
                  <div className="absolute bottom-3 left-3 flex items-center gap-2">
                    <Trophy className="text-white" size={20} />
                    <span className="text-white font-medium text-sm">
                      {award.month}
                    </span>
                  </div>
                </div>
              )}

              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold text-sm"
                    style={{ backgroundColor: getDesignerColor(award.designerId) }}
                  >
                    {getDesignerInitials(award.designerName)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900 dark:text-white truncate">
                      {award.designerName.split(' - ')[1] || award.designerName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Vencedor do mês
                    </p>
                  </div>
                  <button
                    onClick={() => handleDelete(award.id)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {award.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                    {award.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de nova premiação */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
                  <Crown className="text-amber-600 dark:text-amber-400" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
                  Nova Premiação
                </h2>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Designer Vencedor *
                </label>
                <select
                  value={selectedDesigner}
                  onChange={(e) => setSelectedDesigner(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none text-slate-900 dark:text-white"
                >
                  <option value="">Selecione o vencedor...</option>
                  {designers.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Mês *
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg appearance-none text-slate-900 dark:text-white"
                >
                  <option value="">Selecione o mês...</option>
                  {MONTHS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Descrição (opcional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg resize-none text-slate-900 dark:text-white"
                  placeholder="Ex: Melhor performance do mês com 150 artes produzidas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Imagem da Premiação (opcional)
                </label>
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors overflow-hidden">
                  {imageUrl ? (
                    <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Upload className="text-slate-400 mb-2" size={32} />
                      <span className="text-sm text-slate-500">Clique para fazer upload</span>
                      <span className="text-xs text-slate-400 mt-1">Máx. 500KB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                {imageUrl && (
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    Remover imagem
                  </button>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={handleSubmit}
                disabled={!selectedDesigner || !selectedMonth || saving}
                className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <Trophy size={20} />
                {saving ? 'Salvando...' : 'Marcar como Vencedor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
