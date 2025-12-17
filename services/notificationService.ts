import { DesignerNotification } from '../types';

const API_URL = '';

export const notificationService = {
  /**
   * Busca todas as notificações (para painel ADM)
   */
  getAllNotifications: async (): Promise<DesignerNotification[]> => {
    try {
      const res = await fetch(`${API_URL}/api/designer-notifications`);
      if (!res.ok) {
        // Se a tabela não existe ou retornar erro, retornar array vazio
        if (res.status === 404 || res.status === 500) {
          const errorData = await res.json().catch(() => ({}));
          // Se o erro for "no such table", retornar array vazio
          if (errorData.details?.includes('no such table') || errorData.error?.includes('no such table')) {
            return [];
          }
          // Outros erros 500 também retornam array vazio para não quebrar o frontend
          if (res.status === 500) {
            console.warn('Erro ao buscar notificações (tabela pode não existir):', errorData);
            return [];
          }
        }
        throw new Error('Erro ao buscar notificações');
      }
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      // Retornar array vazio em caso de erro para não quebrar o frontend
      return [];
    }
  },

  /**
   * Busca notificação ativa de um designer específico
   */
  getNotificationByDesigner: async (designerId: string): Promise<DesignerNotification | null> => {
    const res = await fetch(`${API_URL}/api/designer-notifications/designer/${designerId}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error('Erro ao buscar notificação do designer');
    return await res.json();
  },

  /**
   * Cria uma nova notificação para um designer
   */
  createNotification: async (
    data: Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>
  ): Promise<DesignerNotification> => {
    console.log('Enviando requisição para criar notificação:', data);
    const res = await fetch(`${API_URL}/api/designer-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Erro ao criar notificação' }));
      console.error('Erro na resposta do servidor:', errorData);
      const errorMessage = errorData.error || errorData.details || `Erro ao criar notificação (${res.status})`;
      throw new Error(errorMessage);
    }

    return await res.json();
  },

  /**
   * Atualiza uma notificação existente
   */
  updateNotification: async (
    id: string,
    data: Partial<Omit<DesignerNotification, 'id' | 'createdAt' | 'updatedAt' | 'designerName'>>
  ): Promise<DesignerNotification> => {
    const res = await fetch(`${API_URL}/api/designer-notifications/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro ao atualizar notificação' }));
      throw new Error(error.error || 'Erro ao atualizar notificação');
    }

    return await res.json();
  },

  /**
   * Ativa/desativa uma notificação
   */
  toggleNotification: async (id: string, enabled: boolean): Promise<DesignerNotification> => {
    const res = await fetch(`${API_URL}/api/designer-notifications/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ enabled }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro ao alterar status da notificação' }));
      throw new Error(error.error || 'Erro ao alterar status da notificação');
    }

    return await res.json();
  },

  /**
   * Remove uma notificação permanentemente
   */
  deleteNotification: async (id: string): Promise<void> => {
    const res = await fetch(`${API_URL}/api/designer-notifications/${id}`, {
      method: 'DELETE',
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Erro ao deletar notificação' }));
      throw new Error(error.error || 'Erro ao deletar notificação');
    }
  },
};

