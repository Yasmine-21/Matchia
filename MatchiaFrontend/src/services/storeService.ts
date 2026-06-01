// src/services/storeService.ts
import apiClient from '../api/apiClient';
import { StoreDto } from '../types/apiTypes';

export const storeService = {
    
     getAllStores: () =>
        apiClient.get<StoreDto[]>('/stores'),

    getStoresByStatus: (status: 'active' | 'inactive') =>
        apiClient.get<StoreDto[]>('/stores', { params: { status } }),

    createStore: (storeData: StoreDto) =>
        apiClient.post<StoreDto>('/stores', storeData),

    updateStore: (id: number, storeData: StoreDto) =>
        apiClient.put<StoreDto>(`/stores/${id}`, storeData),

    patchStore: (id: number, fields: Partial<StoreDto>) =>
        apiClient.patch<StoreDto>(`/stores/${id}`, fields),

    deleteStore: (id: number) =>
        apiClient.delete(`/stores/${id}`)
};
