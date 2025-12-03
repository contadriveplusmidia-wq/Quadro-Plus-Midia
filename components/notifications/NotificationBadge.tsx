import React from 'react';
import { Bell, AlertCircle, AlertTriangle } from 'lucide-react';
import { DesignerNotification, NotificationType } from '../../types';
import { NotificationTooltip } from './NotificationTooltip';

interface NotificationBadgeProps {
  notification: DesignerNotification | null;
}

const getTypeConfig = (type: NotificationType) => {
  switch (type) {
    case 'common':
      return {
        icon: Bell,
        bg: 'bg-slate-100 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        hover: 'hover:bg-slate-200 dark:hover:bg-slate-700',
        animate: '',
        ring: '',
      };
    case 'important':
      return {
        icon: AlertCircle,
        bg: 'bg-yellow-100 dark:bg-yellow-900/20',
        text: 'text-yellow-600 dark:text-yellow-400',
        hover: 'hover:bg-yellow-200 dark:hover:bg-yellow-900/30',
        animate: 'animate-pulse',
        ring: 'ring-2 ring-yellow-400 ring-opacity-75',
      };
    case 'urgent':
      return {
        icon: AlertTriangle,
        bg: 'bg-red-100 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        hover: 'hover:bg-red-200 dark:hover:bg-red-900/30',
        animate: 'animate-bounce',
        ring: 'ring-2 ring-red-500 ring-opacity-75 animate-ping',
      };
  }
};

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ notification }) => {
  if (!notification || !notification.enabled) {
    return null;
  }

  const config = getTypeConfig(notification.type);
  const Icon = config.icon;
  const hasContent = !!(notification.h1 || notification.h2 || notification.h3);

  return (
    <div className="relative group">
      <button
        className={`relative p-2.5 rounded-full ${config.bg} ${config.text} ${config.hover} ${config.ring} transition-all duration-300`}
        aria-label="Notificação"
      >
        <Icon size={20} className={config.animate} />
        {hasContent && (
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span>
        )}
      </button>
      
      {hasContent && <NotificationTooltip notification={notification} />}
    </div>
  );
};


