import apiClient from '../api/apiClient';
import type { ContentStatus, MarketplaceContentDto } from '../types/apiTypes';

export interface CreateMarketplaceContentPayload {
  storeId?: number | null;
  title: string;
  description: string;
  status: ContentStatus;
  marketplaceSlug: string;
  image?: File | null;
}

export interface UpdateMarketplaceContentPayload extends CreateMarketplaceContentPayload {}

const toFormData = (payload: CreateMarketplaceContentPayload) => {
  const formData = new FormData();
  if (payload.storeId != null) {
    formData.append('storeId', String(payload.storeId));
  }
  formData.append('title', payload.title);
  formData.append('description', payload.description);
  formData.append('status', payload.status);
  formData.append('marketplaceSlug', payload.marketplaceSlug);
  if (payload.image) {
    formData.append('image', payload.image);
  }
  return formData;
};

export const marketplaceContentService = {
  getAllContents: () => apiClient.get<MarketplaceContentDto[]>('/api/marketplace-contents'),
  getContentsByMarketplaceSlug: (marketplaceSlug: string) =>
    apiClient.get<MarketplaceContentDto[]>(`/api/marketplace-contents/marketplace/${encodeURIComponent(marketplaceSlug)}`),
  createContent: (payload: CreateMarketplaceContentPayload) =>
    apiClient.post<MarketplaceContentDto>('/api/marketplace-contents', toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  updateContent: (id: number, payload: UpdateMarketplaceContentPayload) =>
    apiClient.put<MarketplaceContentDto>(`/api/marketplace-contents/${id}`, toFormData(payload), {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  deleteContent: (id: number, marketplaceSlug: string) =>
    apiClient.delete<void>(`/api/marketplace-contents/${id}`, {
      params: { marketplaceSlug },
    }),
};
