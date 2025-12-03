import React from 'react';
import { DesignerNotification, NotificationType } from '../../types';

interface NotificationTooltipProps {
  notification: DesignerNotification;
}

const getTypeStyles = (type: NotificationType) => {
  switch (type) {
    case 'common':
      return {
        border: 'border-slate-200 dark:border-slate-700',
        bg: 'bg-white dark:bg-slate-800',
        h1: 'text-slate-900 dark:text-white',
        h2: 'text-slate-700 dark:text-slate-300',
        h3: 'text-slate-600 dark:text-slate-400',
      };
    case 'important':
      return {
        border: 'border-yellow-300 dark:border-yellow-700',
        bg: 'bg-white dark:bg-slate-800',
        h1: 'text-yellow-900 dark:text-yellow-300',
        h2: 'text-yellow-800 dark:text-yellow-400',
        h3: 'text-yellow-700 dark:text-yellow-500',
      };
    case 'urgent':
      return {
        border: 'border-red-300 dark:border-red-700',
        bg: 'bg-white dark:bg-slate-800',
        h1: 'text-red-900 dark:text-red-300',
        h2: 'text-red-800 dark:text-red-400',
        h3: 'text-red-700 dark:text-red-500',
      };
  }
};

export const NotificationTooltip: React.FC<NotificationTooltipProps> = ({ notification }) => {
  const styles = getTypeStyles(notification.type);

  return (
    <div className={`absolute right-0 top-full mt-2 w-80 p-4 ${styles.bg} rounded-lg shadow-xl border ${styles.border} opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50`}>
      {notification.h1 && (
        <h3 className={`text-lg font-semibold mb-2 ${styles.h1}`}>
          {notification.h1}
        </h3>
      )}
      {notification.h2 && (
        <h4 className={`text-sm font-medium mb-2 ${styles.h2}`}>
          {notification.h2}
        </h4>
      )}
      {notification.h3 && (
        <p className={`text-sm ${styles.h3}`}>
          {notification.h3}
        </p>
      )}
    </div>
  );
};


