import apiClient from '../api/apiClient';
import type { MarketplaceBrandingUpdatePayload, MarketplacePublicDto, UserDto } from '../types/apiTypes';

export const bankTenantService = {
  getMarketplaceBySlug: async (slug: string) => {
    const response = await apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/slug/${slug}`);
    return response.data;
  },

  getPublicMarketplaceBySlug: async (slug: string) => {
    const response = await apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/public/slug/${slug}`);
    return response.data;
  },

  getMarketplaceUsers: async () => {
    const response = await apiClient.get<UserDto[]>('/api/v1/users');
    return response.data || [];
  },

  updateMarketplaceStoreStatus: async (id: number, enabled: boolean) => {
    const response = await apiClient.put(`/api/v1/marketplace-stores/${id}`, {
      enabled,
      visible: enabled,
    });
    return response.data;
  },

  updateMarketplaceStoreModuleStatus: async (id: number, enabled: boolean) => {
    const response = await apiClient.put(`/api/v1/marketplace-store-modules/${id}`, {
      enabled,
      visible: enabled,
    });
    return response.data;
  },

  uploadMarketplaceLogo: async (file: File) => {
    const formData = new FormData();
    formData.append('logo', file);
    const response = await apiClient.post<{ logoImageUrl: string }>('/api/admin/marketplaces/upload-logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.logoImageUrl;
  },

  uploadMarketplaceBanner: async (file: File) => {
    const formData = new FormData();
    formData.append('banniere', file);
    const response = await apiClient.post<{ banniereUrl: string }>('/api/admin/marketplaces/upload-banniere', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.banniereUrl;
  },

  updateMarketplaceBranding: async (id: number, payload: MarketplaceBrandingUpdatePayload) => {
    const response = await apiClient.put(`/api/admin/marketplaces/${id}/branding`, payload);
    return response.data;
  },
};
