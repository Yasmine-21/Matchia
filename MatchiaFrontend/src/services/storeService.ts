// src/services/storeService.ts
import apiClient from '../api/apiClient';
import { StoreDto, StoreMarketplaceCountDto } from '../types/apiTypes';

export const storeService = {
    
     getAllStores: () =>
        apiClient.get<StoreDto[]>('/stores'),

    getMarketplaceCounts: () =>
        apiClient.get<StoreMarketplaceCountDto[]>('/stores/marketplace-counts'),

    getStoresByStatus: (status: 'active' | 'inactive') =>
        apiClient.get<StoreDto[]>('/stores', { params: { status } }),

    createStore: (storeData: Omit<StoreDto, 'id' | 'createdAt'>) =>
        apiClient.post<StoreDto>('/stores', storeData),

    updateStore: (id: number, storeData: Partial<StoreDto>) =>
        apiClient.put<StoreDto>(`/stores/${id}`, storeData),

    patchStore: (id: number, fields: Partial<StoreDto>) =>
        apiClient.patch<StoreDto>(`/stores/${id}`, fields),

    deleteStore: (id: number) =>
        apiClient.delete(`/stores/${id}`)
};
