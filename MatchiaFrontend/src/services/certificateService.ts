import apiClient from '../api/apiClient';
import type {
  CertificateDto,
  CertificateHistoryDto,
  CertificateRequestPayload,
  CertificateRevokePayload,
  CertificateTestResponseDto,
} from '../types/apiTypes';

export const certificateService = {
  getAll: () => apiClient.get<CertificateDto[]>('/api/certificates'),
  getById: (id: number) => apiClient.get<CertificateDto>(`/api/certificates/${id}`),
  getHistory: (id: number) => apiClient.get<CertificateHistoryDto[]>(`/api/certificates/${id}/history`),
  issue: (payload: CertificateRequestPayload) => apiClient.post<CertificateDto>('/api/certificates/issue', payload),
  import: (payload: CertificateRequestPayload) => apiClient.post<CertificateDto>('/api/certificates/import', payload),
  activate: (id: number) => apiClient.patch<CertificateDto>(`/api/certificates/${id}/activate`),
  test: (id: number) => apiClient.post<CertificateTestResponseDto>(`/api/certificates/${id}/test`),
  rotate: (id: number) => apiClient.post<CertificateDto>(`/api/certificates/${id}/rotate`),
  revoke: (id: number, payload: CertificateRevokePayload) => apiClient.post<CertificateDto>(`/api/certificates/${id}/revoke`, payload),
};
