import apiClient from '../api/apiClient';

export type AuditCategory = 'core' | 'security' | 'data_config' | 'billing';
export type AuditStatus = 'success' | 'failure';

export interface AuditLog {
  id: number;
  tenantId?: string | null;
  actorId?: string | null;
  actorName: string;
  actorRole?: string | null;
  action: string;
  category: AuditCategory;
  resourceType?: string | null;
  resourceId?: string | null;
  status: AuditStatus;
  ipAddress?: string | null;
  userAgent?: string | null;
  diff?: string | null;
  metadata?: string | null;
  createdAt: string;
}

export interface AuditStats {
  core: number;
  security: number;
  dataConfig: number;
  billing: number;
  success: number;
  failure: number;
  total: number;
}

export interface AuditLogFilters {
  page?: number;
  limit?: number;
  category?: AuditCategory | '';
  action?: string;
  actor_id?: string;
  resource_type?: string;
  resource_id?: string;
  status?: AuditStatus | '';
  start_date?: string;
  end_date?: string;
  search?: string;
  sort?: string;
  direction?: 'asc' | 'desc';
}

export interface PageResponse<T> {
  content: T[];
  number: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const cleanFilters = (filters: AuditLogFilters) =>
  Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''));

export const auditService = {
  getLogs: async (filters: AuditLogFilters = {}) => {
    const response = await apiClient.get<PageResponse<AuditLog>>('/api/audit-logs', {
      params: cleanFilters(filters),
    });
    return response.data;
  },

  getLogById: async (id: number) => {
    const response = await apiClient.get<AuditLog>(`/api/audit-logs/${id}`);
    return response.data;
  },

  getStats: async () => {
    const response = await apiClient.get<AuditStats>('/api/audit-logs/stats');
    return response.data;
  },

  exportLogs: async (filters: AuditLogFilters = {}, format: 'csv' | 'json' = 'csv') => {
    const response = await apiClient.get('/api/audit-logs/export', {
      params: cleanFilters({ ...filters, format } as AuditLogFilters & { format: string }),
      responseType: 'blob',
    });
    return response.data as Blob;
  },
};
