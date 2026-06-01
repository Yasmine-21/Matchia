import apiClient from '../api/apiClient';
import { Bank } from '../types'; 

export const bankService = {
  // Récupérer toutes les banques
  getAllBanks: async () => {
    const response = await apiClient.get<Bank[]>('/banks');
    return response.data;
  },

  
  createBank: async (bankData: Partial<Bank>) => {
    const response = await apiClient.post<Bank>('/banks', bankData);
    return response.data;
  },

 
  getBankById: async (id: number) => {
    const response = await apiClient.get<Bank>(`/banks/${id}`);
    return response.data;
  },
  updateBank: async (id: number, bankData: Partial<Bank>) => {
   
    const response = await apiClient.put<Bank>(`/banks/${id}`, bankData);
    return response.data;
  },


  deleteBank: async (id: number) => {
   
    await apiClient.delete(`/banks/${id}`);
    return true; 
  }
};