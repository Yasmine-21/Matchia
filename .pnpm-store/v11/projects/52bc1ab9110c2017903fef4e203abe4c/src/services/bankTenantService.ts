import apiClient from '../api/apiClient';
import type { MarketplaceBrandingUpdatePayload, MarketplacePublicDto, MarketplaceStoreBannerDto, UserDto } from '../types/apiTypes';

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

  uploadStoreBanner: async (marketplaceStoreId: number, file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await apiClient.post<{ bannerImageUrl: string }>(
      `/api/bank/marketplace-stores/${marketplaceStoreId}/banner`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return response.data.bannerImageUrl;
  },

  getStoreBanners: async (marketplaceStoreId: number) => {
    const response = await apiClient.get<MarketplaceStoreBannerDto>(`/api/bank/marketplace-stores/${marketplaceStoreId}/banner`);
    return response.data;
  },

  addStoreBanner: async (marketplaceStoreId: number, file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await apiClient.post<MarketplaceStoreBannerDto>(`/api/bank/marketplace-stores/${marketplaceStoreId}/banners`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  replaceStoreBannerImage: async (marketplaceStoreId: number, bannerId: number, file: File) => {
    const formData = new FormData();
    formData.append('banner', file);
    const response = await apiClient.put<MarketplaceStoreBannerDto>(`/api/bank/marketplace-stores/${marketplaceStoreId}/banners/${bannerId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  deleteStoreBannerImage: async (marketplaceStoreId: number, bannerId: number) => {
    await apiClient.delete(`/api/bank/marketplace-stores/${marketplaceStoreId}/banners/${bannerId}`);
  },

  deleteLegacyStoreBanner: async (marketplaceStoreId: number) => {
    await apiClient.delete(`/api/bank/marketplace-stores/${marketplaceStoreId}/banner`);
  },

  updateMarketplaceBranding: async (id: number, payload: MarketplaceBrandingUpdatePayload) => {
    const response = await apiClient.put(`/api/admin/marketplaces/${id}/branding`, payload);
    return response.data;
  },
};
