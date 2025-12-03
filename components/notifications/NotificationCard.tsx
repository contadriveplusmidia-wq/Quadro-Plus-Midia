import React from 'react';
import { Edit2, Trash2, Bell, AlertCircle, AlertTriangle } from 'lucide-react';
import { DesignerNotification, NotificationType } from '../../types';

interface NotificationCardProps {
  notification: DesignerNotification;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}

const getTypeConfig = (type: NotificationType) => {
  switch (type) {
    case 'common':
      return {
        icon: Bell,
        label: 'Comum',
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        border: 'border-slate-200 dark:border-slate-700',
      };
    case 'important':
      return {
        icon: AlertCircle,
        label: 'Importante',
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        border: 'border-yellow-200 dark:border-yellow-800',
      };
    case 'urgent':
      return {
        icon: AlertTriangle,
        label: 'Urgência',
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-200 dark:border-red-800',
      };
  }
};

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onEdit,
  onToggle,
  onDelete,
}) => {
  const config = getTypeConfig(notification.type);
  const Icon = config.icon;

  return (
    <div className={`p-4 rounded-lg border ${config.border} ${notification.enabled ? '' : 'opacity-50'}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${config.bg}`}>
            <Icon size={20} className={config.text} />
          </div>
          <div>
            <h4 className="font-medium text-slate-900 dark:text-white">
              {notification.designerName || 'Designer'}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {config.label} • {notification.enabled ? 'Ativa' : 'Inativa'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onToggle}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              notification.enabled
                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
            title={notification.enabled ? 'Desativar' : 'Ativar'}
          >
            {notification.enabled ? 'Ativa' : 'Inativa'}
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
            title="Deletar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      {(notification.h1 || notification.h2 || notification.h3) && (
        <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-1">
          {notification.h1 && (
            <p className="text-sm font-medium text-slate-900 dark:text-white">
              {notification.h1}
            </p>
          )}
          {notification.h2 && (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {notification.h2}
            </p>
          )}
          {notification.h3 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
              {notification.h3}
            </p>
          )}
        </div>
      )}
    </div>
  );
};


