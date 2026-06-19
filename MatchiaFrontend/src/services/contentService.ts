import apiClient from '../api/apiClient';
import type { ContentDto, ContentStatus } from '../types/apiTypes';

export interface CreateContentPayload {
  storeId: number;
  title: string;
  description: string;
  status: ContentStatus;
  marketplaceSlug?: string;
  image?: File | null;
}

export interface UpdateContentPayload extends CreateContentPayload {}

const toFormData = (payload: CreateContentPayload) => {
  const formData = new FormData();
  formData.append('storeId', String(payload.storeId));
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('status', payload.status);
  if (payload.marketplaceSlug) {
    formData.append('marketplaceSlug', payload.marketplaceSlug);
  }
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return formData;
};

export const contentService = {
  getAllContents: () => apiClient.get<ContentDto[]>('/api/contents'),
  getContentsByMarketplaceSlug: (marketplaceSlug: string) =>
    apiClient.get<ContentDto[]>(`/api/contents/marketplace/${encodeURIComponent(marketplaceSlug)}`),
  createContent: (payload: CreateContentPayload) =>
    apiClient.post<ContentDto>('/api/contents', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateContent: (id: number, payload: UpdateContentPayload) =>
    apiClient.put<ContentDto>(`/api/contents/${id}`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteContent: (id: number) =>
    apiClient.delete<void>(`/api/contents/${id}`),
};
