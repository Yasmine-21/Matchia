import apiClient from '../api/apiClient';
import type { UserDto } from '../types/apiTypes';

export type UserPayload = {
  bankId: number;
  fullName: string;
  email: string;
  phone?: string | null;
  contactImageUrl?: string | null;
  role?: string | null;
  status?: string | null;
  password?: string | null;
};

export const userService = {
  getAll: async () => {
    const response = await apiClient.get<UserDto[]>('/api/v1/users');
    return response.data || [];
  },

  create: async (payload: UserPayload) => {
    const response = await apiClient.post<UserDto>('/api/v1/users', payload);
    return response.data;
  },

  update: async (id: number, payload: UserPayload) => {
    const response = await apiClient.put<UserDto>(`/api/v1/users/${id}`, payload);
    return response.data;
  },

  delete: async (id: number) => {
    await apiClient.delete(`/api/v1/users/${id}`);
  },

  uploadContactImage: async (file: File) => {
    const formData = new FormData();
    formData.append('contactImage', file);

    const response = await apiClient.post<{ contactImageUrl: string }>(
      '/api/v1/users/upload-contact-image',
      formData,
      {
        headers: { 'Content-Type': 'multipart/form-data' },
      },
    );

    return response.data.contactImageUrl;
  },
};
