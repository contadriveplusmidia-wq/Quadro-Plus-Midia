import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { User, DesignerNotification } from '../../types';
import { useNotificationContext } from '../../context/NotificationContext';
import { NotificationCard } from '../notifications/NotificationCard';
import { NotificationForm } from '../notifications/NotificationForm';

interface DesignerNotificationPanelProps {
  designers: User[];
}

export const DesignerNotificationPanel: React.FC<DesignerNotificationPanelProps> = ({ designers }) => {
  const {
    notifications,
    loading,
    fetchNotifications,
    createNotification,
    updateNotification,
    toggleNotification,
    deleteNotification,
  } = useNotificationContext();

  const [showForm, setShowForm] = useState(false);
  const [selectedDesigner, setSelectedDesigner] = useState<User | null>(null);
  const [editingNotification, setEditingNotification] = useState<DesignerNotification | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleCreate = () => {
    setSelectedDesigner(null);
    setEditingNotification(null);
    setShowForm(true);
  };

  const handleEdit = (notification: DesignerNotification) => {
    const designer = designers.find(d => d.id === notification.designerId);
    setSelectedDesigner(designer || null);
    setEditingNotification(notification);
    setShowForm(true);
  };

  const handleSave = async (data: {
    designerId: string;
    type: DesignerNotification['type'];
    h1?: string;
    h2?: string;
    h3?: string;
    enabled: boolean;
  }) => {
    setSaving(true);
    try {
      console.log('Salvando notificação:', data);
      if (editingNotification) {
        await updateNotification(editingNotification.id, data);
      } else {
        await createNotification(data);
      }
      await fetchNotifications(); // Recarregar lista
      setShowForm(false);
      setSelectedDesigner(null);
      setEditingNotification(null);
    } catch (error: any) {
      console.error('Erro ao salvar notificação:', error);
      // Re-throw para que o NotificationForm possa exibir o erro
      throw error;
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (notification: DesignerNotification) => {
    try {
      await toggleNotification(notification.id, !notification.enabled);
    } catch (error) {
      console.error('Erro ao alterar status:', error);
    }
  };

  const handleDelete = async (notification: DesignerNotification) => {
    if (!confirm(`Tem certeza que deseja deletar a notificação de ${notification.designerName || 'este designer'}?`)) {
      return;
    }

    try {
      await deleteNotification(notification.id);
    } catch (error) {
      console.error('Erro ao deletar:', error);
      alert('Erro ao deletar notificação');
    }
  };

  // Agrupar notificações por designer
  const notificationsByDesigner = designers.map(designer => {
    const notification = notifications.find(n => n.designerId === designer.id);
    return { designer, notification };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Notificações por Designer
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Gerencie notificações visuais individuais para cada designer
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 dark:hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <Plus size={20} />
          Nova Notificação
        </button>
      </div>

      {loading && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Carregando notificações...
        </div>
      )}

      {!loading && notificationsByDesigner.length === 0 && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          Nenhum designer encontrado
        </div>
      )}

      {!loading && notificationsByDesigner.length > 0 && (
        <div className="space-y-4">
          {notificationsByDesigner.map(({ designer, notification }) => (
            <div key={designer.id}>
              {notification ? (
                <NotificationCard
                  notification={{
                    ...notification,
                    designerName: designer.name,
                  }}
                  onEdit={() => handleEdit(notification)}
                  onToggle={() => handleToggle(notification)}
                  onDelete={() => handleDelete(notification)}
                />
              ) : (
                <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-slate-900 dark:text-white">
                        {designer.name}
                      </h4>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Sem notificação
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDesigner(designer);
                        setEditingNotification(null);
                        setShowForm(true);
                      }}
                      className="px-4 py-2 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors text-sm font-medium"
                    >
                      Criar Notificação
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <NotificationForm
          designer={selectedDesigner}
          designers={designers}
          notification={editingNotification}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setSelectedDesigner(null);
            setEditingNotification(null);
          }}
          saving={saving}
        />
      )}
    </div>
  );
};

