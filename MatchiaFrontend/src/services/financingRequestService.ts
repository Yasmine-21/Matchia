import apiClient from '../api/apiClient';

export type FinancingStatus = 'DRAFT' | 'PENDING' | 'ACCEPTED' | 'REJECTED';
export type FinancingSummary = { id: number; reference: string; clientName: string; productId: number; dealerProduct?: boolean; productName: string; productImageUrl?: string; storeId: number; storeName: string; productPrice?: number; requestedAmount?: number; monthlyPayment?: number; status: FinancingStatus; createdAt: string };
export type ClientProfile = { id?: number; fullName: string; email: string; phone: string; address: string; birthDate?: string; contactImageUrl?: string; bankName?: string; financingRequestCount?: number; status?: 'active' | 'inactive' };
export type FinancingDocument = { id: number; documentType: string; originalFilename: string; contentType?: string; fileSize?: number; uploadedAt: string };
export type FinancingDetail = FinancingSummary & { bankId: number; bankName: string; downPayment?: number; durationMonths?: number; annualRate?: number; simulationData?: string; processingComment?: string; rejectionReason?: string; processedAt?: string; processedByName?: string; client: ClientProfile; documents: FinancingDocument[] };
export type DocumentRequirement = { documentType: string; label: string; required: boolean };
export type SimulationRequest = { productId: number; dealerProductId?: number; storeId: number; requestedAmount?: number; monthlyPayment?: number; downPayment?: number; durationMonths?: number; annualRate?: number; simulationData?: string };

export const financingRequestService = {
  register: (data: unknown) => apiClient.post('/api/client-registration', data),
  profile: () => apiClient.get<ClientProfile>('/api/client/profile'),
  updateProfile: (data: ClientProfile) => apiClient.put<ClientProfile>('/api/client/profile', data),
  dashboard: () => apiClient.get<{ total: number; pending: number; accepted: number; rejected: number; recent: FinancingSummary[] }>('/api/client/dashboard'),
  list: () => apiClient.get<FinancingSummary[]>('/api/client/financing-requests'),
  get: (id: number) => apiClient.get<FinancingDetail>(`/api/client/financing-requests/${id}`),
  create: (data: SimulationRequest) => apiClient.post<FinancingDetail>('/api/client/financing-requests', data),
  submit: (id: number) => apiClient.post<FinancingDetail>(`/api/client/financing-requests/${id}/submit`),
  requirements: (storeId: number) => apiClient.get<DocumentRequirement[]>('/api/client/financing-document-requirements', { params: { storeId } }),
  upload: (id: number, type: string, file: File) => { const data = new FormData(); data.append('file', file); return apiClient.post<FinancingDocument>(`/api/client/financing-requests/${id}/documents/${type}`, data); },
  removeDocument: (id: number, documentId: number) => apiClient.delete(`/api/client/financing-requests/${id}/documents/${documentId}`),
  clientDocumentUrl: (id: number, documentId: number) => `/api/client/financing-requests/${id}/documents/${documentId}/download`,
  bankRequests: (storeId: number, status?: string, search?: string) => apiClient.get<FinancingSummary[]>('/api/bank/financing-requests', { params: { storeId, status, search } }),
  bankRequest: (id: number) => apiClient.get<FinancingDetail>(`/api/bank/financing-requests/${id}`),
  process: (id: number, status: 'ACCEPTED' | 'REJECTED', comment?: string, rejectionReason?: string) => apiClient.post<FinancingDetail>(`/api/bank/financing-requests/${id}/process`, { status, comment, rejectionReason }),
  bankDocumentUrl: (id: number, documentId: number) => `/api/bank/financing-requests/${id}/documents/${documentId}/download`,
};
