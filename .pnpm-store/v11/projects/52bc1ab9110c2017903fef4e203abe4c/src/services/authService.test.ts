import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authService } from './authService';
import apiClient from '../api/apiClient';
import * as sessionStorage from './sessionStorage';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

vi.mock('./sessionStorage', () => ({
  clearStoredSession: vi.fn(),
  setStoredAccessToken: vi.fn()
}));

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should successfully login and return a user', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        role: 'ADMIN_SAAS',
        accessToken: 'token-123'
      };
      (apiClient.post as any).mockResolvedValue({ data: mockUser });

      const result = await authService.login('test@example.com', 'password123');

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/login', {
        email: 'test@example.com',
        identifier: 'test@example.com',
        password: 'password123'
      });
      expect(sessionStorage.setStoredAccessToken).toHaveBeenCalledWith('token-123');
      expect(result?.email).toBe('test@example.com');
      expect(result?.role).toBe('ADMIN_SAAS');
    });

    it('should handle login failure and return null', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Login failed'));

      const result = await authService.login('test@example.com', 'wrong');

      expect(result).toBeNull();
      expect(sessionStorage.setStoredAccessToken).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentUser', () => {
    it('should return the current user on success', async () => {
      const mockData = { id: '2', email: 'user@example.com', token: 'token-456' };
      (apiClient.get as any).mockResolvedValue({ data: mockData });

      const result = await authService.getCurrentUser();

      expect(apiClient.get).toHaveBeenCalledWith('/api/auth/me');
      expect(sessionStorage.setStoredAccessToken).toHaveBeenCalledWith('token-456');
      expect(result?.email).toBe('user@example.com');
    });

    it('should return null on failure', async () => {
      (apiClient.get as any).mockRejectedValue(new Error('Fetch failed'));

      const result = await authService.getCurrentUser();
      expect(result).toBeNull();
    });
  });

  describe('restoreSession', () => {
    it('should restore session successfully', async () => {
      const mockData = { id: '3', email: 'restore@example.com', accessToken: 'restored-token' };
      (apiClient.post as any).mockResolvedValue({ data: mockData });

      const result = await authService.restoreSession();

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {});
      expect(sessionStorage.setStoredAccessToken).toHaveBeenCalledWith('restored-token');
      expect(result?.email).toBe('restore@example.com');
    });

    it('should handle failure and clear session', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Restore failed'));

      const result = await authService.restoreSession();
      expect(result).toBeNull();
      expect(sessionStorage.clearStoredSession).toHaveBeenCalled();
    });
  });

  describe('refreshAccessToken', () => {
    it('should refresh token successfully', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { accessToken: 'new-token' } });

      const result = await authService.refreshAccessToken();

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/refresh', {});
      expect(sessionStorage.setStoredAccessToken).toHaveBeenCalledWith('new-token');
      expect(result).toBe('new-token');
    });

    it('should fail and clear session', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Refresh failed'));

      const result = await authService.refreshAccessToken();
      expect(result).toBeNull();
      expect(sessionStorage.clearStoredSession).toHaveBeenCalled();
    });
  });

  describe('forgotPassword', () => {
    it('should send a reset link', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });

      await expect(authService.forgotPassword('test@example.com')).resolves.toBeDefined();
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/forgot-password', {
        email: 'test@example.com',
        identifier: 'test@example.com'
      });
    });

    it('should handle errors gracefully', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Server error'));
      await expect(authService.forgotPassword('test@example.com')).rejects.toThrow();
    });
  });

  describe('resetPassword', () => {
    it('should reset password successfully', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });
      
      await expect(authService.resetPassword('token', 'newPass', 'newPass')).resolves.toBeDefined();
      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/reset-password', {
        token: 'token',
        password: 'newPass',
        confirmPassword: 'newPass'
      });
    });

    it('should handle reset password errors', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Server error'));
      await expect(authService.resetPassword('token', 'newPass', 'newPass')).rejects.toThrow();
    });
  });

  describe('logout', () => {
    it('should logout and clear session', async () => {
      (apiClient.post as any).mockResolvedValue({ data: { success: true } });
      const dispatchEventSpy = vi.spyOn(window, 'dispatchEvent');

      await authService.logout();

      expect(apiClient.post).toHaveBeenCalledWith('/api/auth/logout', {});
      expect(sessionStorage.clearStoredSession).toHaveBeenCalled();
      expect(dispatchEventSpy).toHaveBeenCalled();
    });
    
    it('should clear session even if logout API fails', async () => {
      (apiClient.post as any).mockRejectedValue(new Error('Network error'));
      
      await authService.logout();
      
      expect(sessionStorage.clearStoredSession).toHaveBeenCalled();
    });
  });

  describe('getRedirectUrl', () => {
    it('should return correct path based on user role', () => {
      expect(authService.getRedirectUrl({ role: 'ADMIN_SAAS' } as any)).toBe('/saas/dashboard');
      expect(authService.getRedirectUrl({ role: 'ADMIN_BANK' } as any)).toBe('/bank/dashboard');
      expect(authService.getRedirectUrl({ role: 'DEALER_ADMIN' } as any)).toBe('/dealer/dashboard');
      expect(authService.getRedirectUrl({ role: 'CLIENT' } as any)).toBe('/client/dashboard');
      expect(authService.getRedirectUrl({ role: 'UNKNOWN' } as any)).toBe('/');
    });
  });
});
