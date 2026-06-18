import apiClient from '../api/apiClient';
import { RequestDto, RequestPayload, RequestStoreSelectionDto } from '../types/apiTypes';

export interface RequestRejectionPayload {
  rejectionReason?: string;
}

export interface BankStoreRequestPayload {
  bankId: number;
  requestType: RequestDto['requestType'];
  bankName: string;
  bankEmail: string;
  country: string;
  website?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  description?: string;
  bankDescription?: string;
  establishmentYear?: number;
  marketplaceSlug: string;
  marketplaceDescription?: string;
  primaryColor: string;
  secondaryColor: string;
  storeIds: number[];
  moduleIds?: number[];
  selectedStoreDetails?: RequestStoreSelectionDto[];
  totalAmount: number;
  totalMonthlyPrice?: number;
  priority?: string;
  createdBy?: string;
}

const toFormData = (payload: RequestPayload) => {
  const formData = new FormData();

  formData.append('bankName', payload.bankName);
  formData.append('bankEmail', payload.bankEmail);
  formData.append('country', payload.country);
  formData.append('website', payload.website || '');
  formData.append('contactName', payload.contactName);
  formData.append('contactEmail', payload.contactEmail);
  formData.append('contactPhone', payload.contactPhone);
  if (payload.contactImage) {
    formData.append('contactImage', payload.contactImage);
  }
  formData.append('description', payload.description || '');
  formData.append('bankDescription', payload.bankDescription || payload.description || '');
  if (payload.establishmentYear) {
    formData.append('establishmentYear', String(payload.establishmentYear));
  }
  formData.append('marketplaceSlug', payload.marketplaceSlug);
  formData.append('marketplaceDescription', payload.marketplaceDescription || '');
  formData.append('primaryColor', payload.primaryColor);
  formData.append('secondaryColor', payload.secondaryColor);
  if (payload.banniereUrl) {
    formData.append('banniereUrl', payload.banniereUrl);
  }
  formData.append('selectedStores', JSON.stringify(payload.selectedStores || payload.storeIds));
  formData.append('selectedModules', JSON.stringify(payload.moduleIds));
  formData.append('totalAmount', String(payload.totalAmount));
  formData.append('totalMonthlyPrice', String(payload.totalMonthlyPrice ?? payload.totalAmount));

  if (payload.logo) {
    formData.append('logo', payload.logo);
  }

  if (payload.banniere) {
    formData.append('banniere', payload.banniere);
  }

  return formData;
};

export const requestService = {
  createRequest: (payload: RequestPayload) =>
    apiClient.post<RequestDto>('/api/join-requests', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  createBankStoreRequest: (payload: BankStoreRequestPayload) =>
    apiClient.post<RequestDto>('/api/requests', payload),

  getRequests: () => apiClient.get<RequestDto[]>('/api/admin/join-requests'),

  getBankRequests: (bankId: number) =>
    apiClient.get<RequestDto[]>(`/api/requests/bank/${bankId}`),

  getBankRequestById: (id: number) =>
    apiClient.get<RequestDto>(`/api/requests/${id}`),

  getRequestById: (id: number) => apiClient.get<RequestDto>(`/api/admin/join-requests/${id}`),

  getPendingCount: () => apiClient.get<{ count: number }>('/api/admin/join-requests/pending-count'),

  updateRequestStatus: (id: number, status: RequestDto['status']) =>
    apiClient.patch<RequestDto>(`/api/admin/join-requests/${id}/status`, { status }),

  approveRequest: (id: number) => apiClient.put<RequestDto>(`/api/admin/join-requests/${id}/approve`),

  rejectRequest: (id: number, payload: RequestRejectionPayload = {}) =>
    apiClient.put<RequestDto>(`/api/admin/join-requests/${id}/reject`, payload),
};
