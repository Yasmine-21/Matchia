import axios from 'axios';
import apiClient from '../api/apiClient';
import type { User } from '../types';
import { clearStoredSession, setStoredAccessToken } from './sessionStorage';

const normalizeRole = (role?: string | null): User['role'] => {
  if (role === 'ADMIN_SAAS' || role === 'SAAS_ADMIN' || role === 'SUPER_ADMIN') {
    return 'ADMIN_SAAS';
  }

  if (role === 'ADMIN_BANK' || role === 'BANK_ADMIN' || role === 'ADMIN' || role === 'MANAGER' || role === 'USER') {
    return 'ADMIN_BANK';
  }

  if (role === 'CLIENT') {
    return 'CLIENT';
  }

  if (role === 'DEALER_ADMIN') {
    return 'DEALER_ADMIN';
  }

  return 'CLIENT';
};

const getBankIdFromPayload = (payload: any): string | undefined => {
  if (!payload) return undefined;
  if (payload.bankId !== undefined && payload.bankId !== null) {
    return String(payload.bankId);
  }
  if (payload.bank_id !== undefined && payload.bank_id !== null) {
    return String(payload.bank_id);
  }
  return undefined;
};

const extractApiErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    const message = (error.response?.data as { message?: string } | string | undefined);
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    if (message && typeof message === 'object' && 'message' in message && typeof message.message === 'string' && message.message.trim()) {
      return message.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const buildUserFromAuthPayload = (data: any, fallbackEmail?: string): User => ({
  id: data?.id != null ? String(data.id) : `user-${data?.email ?? fallbackEmail ?? 'unknown'}`,
  name: data?.name || data?.fullName || data?.email || fallbackEmail || 'Utilisateur',
  email: data?.email || fallbackEmail || '',
  phone: data?.phone || data?.phoneNumber || null,
  address: data?.address || data?.adresse || null,
  role: normalizeRole(data?.role) as User['role'],
  bank_id: getBankIdFromPayload(data),
  dealer_id: data?.dealerId != null ? String(data.dealerId) : undefined,
  contactImageUrl: data?.contactImageUrl || data?.contact_image_url || null,
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
});

export const authService = {
  async login(email: string, password: string): Promise<User | null> {
    try {
      const response = await apiClient.post('/api/auth/login', {
        email,
        identifier: email,
        password,
      });

      const data = response.data ?? {};
      const accessToken = data.accessToken || data.token;
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }

      return buildUserFromAuthPayload(data, email);
    } catch (error) {
      console.error('Login error:', error);
      return null;
    }
  },

  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.get('/api/auth/me');
      const data = response.data ?? {};
      const accessToken = data.accessToken || data.token;
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }
      return buildUserFromAuthPayload(data, data.email);
    } catch (error) {
      console.error('Current user load error:', error);
      return null;
    }
  },

  async restoreSession(): Promise<User | null> {
    try {
      const response = await apiClient.post('/api/auth/refresh', {});
      const data = response.data ?? {};
      const accessToken = data.accessToken || data.token;
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }

      return buildUserFromAuthPayload(data);
    } catch (error) {
      console.error('Session restore error:', error);
      clearStoredSession();
      return null;
    }
  },

  async refreshAccessToken(): Promise<string | null> {
    try {
      const response = await apiClient.post('/api/auth/refresh', {});
      const accessToken = response.data?.accessToken || response.data?.token || null;
      if (accessToken) {
        setStoredAccessToken(accessToken);
      }
      return accessToken;
    } catch (error) {
      console.error('Refresh token error:', error);
      clearStoredSession();
      return null;
    }
  },

  async forgotPassword(email: string) {
    try {
      return await apiClient.post('/api/auth/forgot-password', { email, identifier: email });
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Impossible d’envoyer le lien de réinitialisation.'));
    }
  },

  async resetPassword(token: string, password: string, confirmPassword: string) {
    try {
      return await apiClient.post('/api/auth/reset-password', {
        token,
        password,
        confirmPassword,
      });
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Impossible de réinitialiser le mot de passe.'));
    }
  },

  async logout() {
    try {
      await apiClient.post('/api/auth/logout', {});
    } catch (error) {
      console.warn('Logout request failed, clearing local session anyway.', error);
    } finally {
      clearStoredSession();
      window.dispatchEvent(new Event('matchia-auth-cleared'));
    }
  },

  getRedirectUrl(user: User): string {
    if (user.role === 'ADMIN_SAAS') {
      return '/saas/dashboard';
    }

    if (user.role === 'ADMIN_BANK') {
      return '/bank/dashboard';
    }

    if (user.role === 'DEALER_ADMIN') {
      return '/dealer/dashboard';
    }

    if (user.role === 'CLIENT') {
      return '/client/dashboard';
    }

    return '/';
  },
};
