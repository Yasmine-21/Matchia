import apiClient from '../api/apiClient';

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';
  entityType: string;
  entityId: number;
  changes?: Record<string, any>;
  timestamp: string;
  ipAddress?: string;
}

export const auditService = {
  // Récupérer tous les logs d'audit
  getLogs: async () => {
    const response = await apiClient.get<AuditLog[]>('/audit/logs');
    return response.data;
  },

  // Récupérer les logs filtrés
  getFilteredLogs: async (filters: {
    userId?: number;
    action?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    const response = await apiClient.get<AuditLog[]>('/audit/logs', { params: filters });
    return response.data;
  },

  // Exporter les logs en CSV
  exportLogs: async () => {
    const response = await apiClient.get('/audit/logs/export', {
      responseType: 'blob',
    });
    return response.data;
  },
};
