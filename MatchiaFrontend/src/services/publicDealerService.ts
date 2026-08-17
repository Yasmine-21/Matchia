import apiClient from '../api/apiClient';

export interface PublicDealer {
  companyName: string;
  logoUrl?: string | null;
  storeName: string;
  storeDescription?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  website?: string | null;
}

export const publicDealerService = {
  async getActiveDealers() {
    const response = await apiClient.get<PublicDealer[]>('/api/public/dealers');
    return response.data;
  },
};
