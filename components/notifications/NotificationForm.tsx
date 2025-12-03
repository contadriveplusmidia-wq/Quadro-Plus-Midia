import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DesignerNotification, NotificationType, User } from '../../types';

interface NotificationFormProps {
  designer: User | null;
  designers?: User[]; // Lista de designers para seleção
  notification: DesignerNotification | null;
  onSave: (data: {
    designerId: string;
    type: NotificationType;
    h1?: string;
    h2?: string;
    h3?: string;
    enabled: boolean;
  }) => Promise<void>;
  onClose: () => void;
  saving?: boolean;
}

export const NotificationForm: React.FC<NotificationFormProps> = ({
  designer: initialDesigner,
  designers = [],
  notification,
  onSave,
  onClose,
  saving = false,
}) => {
  const [selectedDesignerId, setSelectedDesignerId] = useState<string>(initialDesigner?.id || '');
  const [type, setType] = useState<NotificationType>(notification?.type || 'common');
  const [h1, setH1] = useState(notification?.h1 || '');
  const [h2, setH2] = useState(notification?.h2 || '');
  const [h3, setH3] = useState(notification?.h3 || '');
  const [enabled, setEnabled] = useState(notification?.enabled ?? true);
  const [error, setError] = useState<string | null>(null);

  const selectedDesigner = designers.find(d => d.id === selectedDesignerId) || initialDesigner;

  useEffect(() => {
    if (notification) {
      setType(notification.type);
      setH1(notification.h1 || '');
      setH2(notification.h2 || '');
      setH3(notification.h3 || '');
      setEnabled(notification.enabled);
      setSelectedDesignerId(notification.designerId);
    } else if (initialDesigner) {
      setSelectedDesignerId(initialDesigner.id);
    }
  }, [notification, initialDesigner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação: pelo menos um campo de conteúdo deve estar preenchido
    if (!h1.trim() && !h2.trim() && !h3.trim()) {
      setError('Preencha pelo menos um campo (H1, H2 ou H3)');
      return;
    }

    if (!selectedDesignerId) {
      setError('Selecione um designer');
      return;
    }

    try {
      await onSave({
        designerId: selectedDesignerId,
        type,
        h1: h1.trim() || undefined,
        h2: h2.trim() || undefined,
        h3: h3.trim() || undefined,
        enabled,
      });
      onClose();
    } catch (err: any) {
      console.error('Erro ao salvar notificação:', err);
      const errorMessage = err?.message || err?.error || 'Erro ao salvar notificação';
      setError(errorMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 z-10">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            {notification ? 'Editar Notificação' : 'Nova Notificação'}
            {selectedDesigner && ` - ${selectedDesigner.name}`}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
              {error}
            </div>
          )}

          {(!initialDesigner || designers.length > 0) && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                Selecione um designer {!initialDesigner && <span className="text-red-500">*</span>}
              </label>
              <select
                value={selectedDesignerId}
                onChange={(e) => setSelectedDesignerId(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-600 dark:focus:ring-slate-500 outline-none transition-colors"
                required={!initialDesigner}
              >
                <option value="">Selecione um designer...</option>
                {designers.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Tipo de Alerta
            </label>
            <div className="flex gap-3">
              {(['common', 'important', 'urgent'] as NotificationType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all duration-200 text-sm font-medium ${
                    type === t
                      ? t === 'common'
                        ? 'border-slate-400 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        : t === 'important'
                        ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                        : 'border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                      : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                  }`}
                >
                  {t === 'common' ? 'Comum' : t === 'important' ? 'Importante' : 'Urgência'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Título Principal (H1) (opcional)
            </label>
            <input
              type="text"
              value={h1}
              onChange={(e) => setH1(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-600 dark:focus:ring-slate-500 outline-none transition-colors"
              placeholder="Ex: Atenção Importante"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {h1.length}/500 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Subtítulo (H2) (opcional)
            </label>
            <input
              type="text"
              value={h2}
              onChange={(e) => setH2(e.target.value)}
              maxLength={500}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-600 dark:focus:ring-slate-500 outline-none transition-colors"
              placeholder="Ex: Nova atualização disponível"
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {h2.length}/500 caracteres
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Descrição (H3) (opcional)
            </label>
            <textarea
              value={h3}
              onChange={(e) => setH3(e.target.value)}
              rows={4}
              maxLength={2000}
              className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-brand-600 dark:focus:ring-slate-500 outline-none transition-colors resize-none"
              placeholder="Ex: Verifique as novas diretrizes de design..."
            />
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {h3.length}/2000 caracteres
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                Exibir Notificação
              </label>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Ative ou desative a exibição da notificação
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-300 dark:peer-focus:ring-slate-800 rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-3 bg-brand-600 hover:bg-brand-700 dark:hover:bg-slate-700 text-white rounded-lg disabled:opacity-50 transition-colors font-medium"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

