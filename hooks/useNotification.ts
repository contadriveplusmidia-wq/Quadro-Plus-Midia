import { useEffect, useState } from 'react';
import { DesignerNotification } from '../types';
import { useNotificationContext } from '../context/NotificationContext';

interface UseNotificationReturn {
  notification: DesignerNotification | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook customizado para buscar notificação de um designer específico
 */
export const useNotification = (designerId: string | undefined): UseNotificationReturn => {
  const { fetchNotificationByDesigner, getNotificationByDesigner } = useNotificationContext();
  const [notification, setNotification] = useState<DesignerNotification | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refetch = async () => {
    if (!designerId) {
      setNotification(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      // Primeiro tenta buscar do cache
      const cached = getNotificationByDesigner(designerId);
      if (cached) {
        setNotification(cached);
        setLoading(false);
        return;
      }

      // Se não encontrou no cache, busca da API
      const fetched = await fetchNotificationByDesigner(designerId);
      setNotification(fetched);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao buscar notificação'));
      setNotification(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [designerId]);

  // Refetch quando a janela ganha foco (para atualizações em tempo real)
  useEffect(() => {
    const handleFocus = () => {
      if (designerId) {
        refetch();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [designerId]);

  return {
    notification,
    loading,
    error,
    refetch,
  };
};

