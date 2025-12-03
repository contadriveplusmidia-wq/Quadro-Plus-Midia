import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { DesignerNotification } from '../types';
import { notificationService } from '../services/notificationService';

interface NotificationContextType {
  notifications: DesignerNotification[];
  loading: boolean;
  error: Error | null;
  
  // Ações
  fetchNotifications: () => Promise<void>;
  fetchNotificationByDesigner: (designerId: string) => Promise<DesignerNotification | null>;
  createNotification: (data: Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>) => Promise<void>;
  updateNotification: (id: string, data: Partial<Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>>) => Promise<void>;
  toggleNotification: (id: string, enabled: boolean) => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  
  // Helpers
  getNotificationByDesigner: (designerId: string) => DesignerNotification | null;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<DesignerNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationService.getAllNotifications();
      setNotifications(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro desconhecido'));
      console.error('Erro ao buscar notificações:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationByDesigner = async (designerId: string): Promise<DesignerNotification | null> => {
    try {
      const notification = await notificationService.getNotificationByDesigner(designerId);
      
      // Atualizar cache local se encontrou
      if (notification) {
        setNotifications(prev => {
          const exists = prev.find(n => n.id === notification.id);
          if (exists) {
            return prev.map(n => n.id === notification.id ? notification : n);
          }
          return [...prev, notification];
        });
      }
      
      return notification;
    } catch (err) {
      console.error('Erro ao buscar notificação do designer:', err);
      return null;
    }
  };

  const createNotification = async (
    data: Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>
  ) => {
    setError(null);
    try {
      const newNotification = await notificationService.createNotification(data);
      setNotifications(prev => [...prev, newNotification]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao criar notificação'));
      throw err;
    }
  };

  const updateNotification = async (
    id: string,
    data: Partial<Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>>
  ) => {
    setError(null);
    try {
      const updatedNotification = await notificationService.updateNotification(id, data);
      setNotifications(prev => prev.map(n => n.id === id ? updatedNotification : n));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao atualizar notificação'));
      throw err;
    }
  };

  const toggleNotification = async (id: string, enabled: boolean) => {
    setError(null);
    try {
      const updatedNotification = await notificationService.toggleNotification(id, enabled);
      setNotifications(prev => prev.map(n => n.id === id ? updatedNotification : n));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao alterar status da notificação'));
      throw err;
    }
  };

  const deleteNotification = async (id: string) => {
    setError(null);
    try {
      await notificationService.deleteNotification(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao deletar notificação'));
      throw err;
    }
  };

  const getNotificationByDesigner = (designerId: string): DesignerNotification | null => {
    return notifications.find(n => n.designerId === designerId && n.enabled) || null;
  };

  // Carregar notificações ao montar (apenas no ADM)
  useEffect(() => {
    // Não carregar automaticamente - será carregado sob demanda
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        loading,
        error,
        fetchNotifications,
        fetchNotificationByDesigner,
        createNotification,
        updateNotification,
        toggleNotification,
        deleteNotification,
        getNotificationByDesigner,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};


