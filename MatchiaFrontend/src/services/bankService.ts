import apiClient from '../api/apiClient';
import { Bank } from '../types';
import { BankStatus } from '../types/apiTypes';

export interface BankFormPayload {
  name: string;
  email?: string;
  country?: string;
  slug?: string;
  websiteUrl?: string;
  description?: string;
  establishmentYear?: number | null;
  status?: BankStatus;
  logo?: File | null;
}

const toFormData = (payload: BankFormPayload) => {
  const formData = new FormData();
  formData.append('name', payload.name);
  formData.append('email', payload.email || '');
  formData.append('country', payload.country || '');
  formData.append('slug', payload.slug || '');
  formData.append('websiteUrl', payload.websiteUrl || '');
  formData.append('description', payload.description || '');
  if (payload.establishmentYear) {
    formData.append('establishmentYear', String(payload.establishmentYear));
  }
  if (payload.status) {
    formData.append('status', payload.status);
  }
  if (payload.logo) {
    formData.append('logo', payload.logo);
  }
  return formData;
};

const normalizeBank = (bank: any): Bank => {
  const establishedYear = bank.establishmentYear ?? bank.establishedYear ?? bank.established_year ?? 0;
  const totalUsers = bank.totalUsers ?? bank.total_users ?? 0;
  const logoUrl = bank.logoUrl ?? bank.logo_url ?? '';
  const websiteUrl = bank.websiteUrl ?? bank.website_url ?? '';
  const createdAt = bank.createdAt ?? bank.created_at ?? '';

  return {
    ...bank,
    id: Number(bank.id),
    logoUrl,
    logo_url: logoUrl,
    websiteUrl,
    website_url: websiteUrl,
    establishedYear,
    establishmentYear: bank.establishmentYear ?? establishedYear,
    established_year: establishedYear,
    totalUsers,
    total_users: totalUsers,
    assignedStoresCount: bank.assignedStoresCount ?? 0,
    rating: bank.rating ?? 0,
    createdAt,
    created_at: createdAt,
    updated_at: bank.updatedAt ?? bank.updated_at ?? '',
  };
};

export const bankService = {
  getAllBanks: async () => {
    const response = await apiClient.get<any[]>('/banks');
    return response.data.map(normalizeBank);
  },

  createBank: async (bankData: BankFormPayload | Partial<Bank>) => {
    const hasLogoPayload = 'logo' in bankData;
    const response = hasLogoPayload
      ? await apiClient.post<any>('/banks', toFormData(bankData as BankFormPayload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      : await apiClient.post<any>('/banks', bankData);
    return normalizeBank(response.data);
  },

  getBankById: async (id: number) => {
    const response = await apiClient.get<any>(`/banks/${id}`);
    return normalizeBank(response.data);
  },

  updateBank: async (id: number, bankData: BankFormPayload | Partial<Bank>) => {
    const hasLogoPayload = 'logo' in bankData;
    const response = hasLogoPayload
      ? await apiClient.put<any>(`/banks/${id}`, toFormData(bankData as BankFormPayload), {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
      : await apiClient.put<any>(`/banks/${id}`, bankData);
    return normalizeBank(response.data);
  },

  // ✅ Après — simple et direct
updateBankStatus: async (id: number, status: BankStatus) => {
    const response = await apiClient.patch<any>(`/banks/${id}/status`, { status });
    return normalizeBank(response.data);
},

  deleteBank: async (id: number) => {
    await apiClient.delete(`/banks/${id}`);
    return true;
  },
};
