// src/services/storeService.ts
import apiClient from '../api/apiClient';
import { StoreDto } from '../types/apiTypes';

export const storeService = {
    
    getAllStores: async () => {
        return await apiClient.get<StoreDto[]>('/stores');
    },

    createStore: async (storeData: StoreDto) => {
        return await apiClient.post<StoreDto>('/stores', storeData);
    },
    updateStore: async (id: number, storeData: StoreDto) => {
        return await apiClient.put<StoreDto>(`/stores/${id}`, storeData);
    },
    patchStore: async (id: number, fields: Partial<StoreDto>) => {
        return await apiClient.patch<StoreDto>(`/stores/${id}`, fields);
    },

    deleteStore: async (id: number) => {
        return await apiClient.delete(`/stores/${id}`);
    }
};