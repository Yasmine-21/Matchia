import apiClient from '../api/apiClient';
import { RequestDto, RequestPayload } from '../types/apiTypes';

const toFormData = (payload: RequestPayload) => {
  const formData = new FormData();

  formData.append('bankName', payload.bankName);
  formData.append('bankEmail', payload.bankEmail);
  formData.append('country', payload.country);
  formData.append('website', payload.website || '');
  formData.append('contactName', payload.contactName);
  formData.append('contactEmail', payload.contactEmail);
  formData.append('contactPhone', payload.contactPhone);
  formData.append('description', payload.description || '');
  formData.append('selectedStores', JSON.stringify(payload.storeIds));
  formData.append('selectedModules', JSON.stringify(payload.moduleIds));
  formData.append('totalAmount', String(payload.totalAmount));

  if (payload.logo) {
    formData.append('logo', payload.logo);
  }

  return formData;
};

export const requestService = {
  createRequest: (payload: RequestPayload) =>
    apiClient.post<RequestDto>('/api/requests', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  getRequests: () => apiClient.get<RequestDto[]>('/api/requests'),

  approveRequest: (id: number) => apiClient.put<RequestDto>(`/api/requests/${id}/approve`),

  rejectRequest: (id: number) => apiClient.put<RequestDto>(`/api/requests/${id}/reject`),
};
