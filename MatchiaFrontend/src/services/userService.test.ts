import { describe, it, expect, vi, beforeEach } from 'vitest';
import { userService, UserPayload } from './userService';
import apiClient from '../api/apiClient';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getAll', () => {
    it('should fetch all users successfully', async () => {
      const mockUsers = [{ id: 1, fullName: 'John Doe' }];
      (apiClient.get as any).mockResolvedValue({ data: mockUsers });

      const result = await userService.getAll();

      expect(apiClient.get).toHaveBeenCalledWith('/api/v1/users');
      expect(result).toEqual(mockUsers);
    });

    it('should return empty array if data is null/undefined', async () => {
      (apiClient.get as any).mockResolvedValue({});

      const result = await userService.getAll();

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    it('should create user', async () => {
      const payload: UserPayload = { fullName: 'Jane Doe', email: 'jane@test.com' };
      const mockResponse = { id: 2, ...payload };
      (apiClient.post as any).mockResolvedValue({ data: mockResponse });

      const result = await userService.create(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/api/v1/users', payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('update', () => {
    it('should update user', async () => {
      const payload: UserPayload = { fullName: 'Jane Updated', email: 'jane@test.com' };
      const mockResponse = { id: 2, ...payload };
      (apiClient.put as any).mockResolvedValue({ data: mockResponse });

      const result = await userService.update(2, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/api/v1/users/2', payload);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('delete', () => {
    it('should delete user', async () => {
      (apiClient.delete as any).mockResolvedValue({});

      await userService.delete(3);

      expect(apiClient.delete).toHaveBeenCalledWith('/api/v1/users/3');
    });
  });

  describe('uploadContactImage', () => {
    it('should upload contact image and return the url', async () => {
      const mockUrl = 'https://example.com/image.png';
      (apiClient.post as any).mockResolvedValue({ data: { contactImageUrl: mockUrl } });
      
      const file = new File(['dummy'], 'image.png', { type: 'image/png' });
      const result = await userService.uploadContactImage(file);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/api/v1/users/upload-contact-image',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      
      const formDataArg = (apiClient.post as any).mock.calls[0][1];
      expect(formDataArg.get('contactImage')).toBe(file);
      
      expect(result).toBe(mockUrl);
    });
  });
});
