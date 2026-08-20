import { describe, it, expect, vi, beforeEach } from 'vitest';
import { bankService, BankFormPayload } from './bankService';
import apiClient from '../api/apiClient';
import { BankStatus } from '../types/apiTypes';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn() }
}));

describe('bankService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockBankRaw = {
    id: '1',
    name: 'Bank 1',
    establishmentYear: 1990,
    totalUsers: 100,
    logoUrl: 'logo.png',
    websiteUrl: 'web.com',
    createdAt: '2020-01-01'
  };

  const expectedNormalized = {
    id: 1,
    name: 'Bank 1',
    establishedYear: 1990,
    establishmentYear: 1990,
    established_year: 1990,
    totalUsers: 100,
    total_users: 100,
    logoUrl: 'logo.png',
    logo_url: 'logo.png',
    websiteUrl: 'web.com',
    website_url: 'web.com',
    createdAt: '2020-01-01',
    created_at: '2020-01-01',
    assignedStoresCount: 0,
    rating: 0,
    updated_at: ''
  };

  describe('getAllBanks', () => {
    it('should fetch and normalize all banks', async () => {
      (apiClient.get as any).mockResolvedValue({ data: [mockBankRaw] });
      
      const result = await bankService.getAllBanks();
      
      expect(apiClient.get).toHaveBeenCalledWith('/banks');
      expect(result).toEqual([expectedNormalized]);
    });
  });

  describe('createBank', () => {
    it('should create bank using JSON if no logo is provided', async () => {
      (apiClient.post as any).mockResolvedValue({ data: mockBankRaw });
      const payload = { name: 'Bank 1' };

      const result = await bankService.createBank(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/banks', payload);
      expect(result).toEqual(expectedNormalized);
    });

    it('should create bank using FormData if logo is provided', async () => {
      (apiClient.post as any).mockResolvedValue({ data: mockBankRaw });
      const logoFile = new File([''], 'logo.png', { type: 'image/png' });
      const payload: BankFormPayload = { name: 'Bank 1', logo: logoFile, establishmentYear: 2000, status: 'active' as BankStatus };

      const result = await bankService.createBank(payload);

      expect(apiClient.post).toHaveBeenCalledWith(
        '/banks',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result).toEqual(expectedNormalized);
      
      const formDataArg = (apiClient.post as any).mock.calls[0][1];
      expect(formDataArg.get('name')).toBe('Bank 1');
      expect(formDataArg.get('establishmentYear')).toBe('2000');
      expect(formDataArg.get('status')).toBe('active');
    });
  });

  describe('getBankById', () => {
    it('should fetch and normalize bank by ID', async () => {
      (apiClient.get as any).mockResolvedValue({ data: mockBankRaw });
      
      const result = await bankService.getBankById(1);
      
      expect(apiClient.get).toHaveBeenCalledWith('/banks/1');
      expect(result).toEqual(expectedNormalized);
    });
  });

  describe('updateBank', () => {
    it('should update bank using JSON if no logo is provided', async () => {
      (apiClient.put as any).mockResolvedValue({ data: mockBankRaw });
      const payload = { name: 'Bank 1 Updated' };

      const result = await bankService.updateBank(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith('/banks/1', payload);
      expect(result).toEqual(expectedNormalized);
    });

    it('should update bank using FormData if logo is provided', async () => {
      (apiClient.put as any).mockResolvedValue({ data: mockBankRaw });
      const logoFile = new File([''], 'logo.png', { type: 'image/png' });
      const payload: BankFormPayload = { name: 'Bank 1', logo: logoFile };

      const result = await bankService.updateBank(1, payload);

      expect(apiClient.put).toHaveBeenCalledWith(
        '/banks/1',
        expect.any(FormData),
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      expect(result).toEqual(expectedNormalized);
    });
  });

  describe('updateBankStatus', () => {
    it('should update bank status and normalize the response', async () => {
      (apiClient.patch as any).mockResolvedValue({ data: mockBankRaw });
      
      const result = await bankService.updateBankStatus(1, 'inactive' as BankStatus);
      
      expect(apiClient.patch).toHaveBeenCalledWith('/banks/1/status', { status: 'inactive' });
      expect(result).toEqual(expectedNormalized);
    });
  });

  describe('deleteBank', () => {
    it('should delete bank by ID', async () => {
      (apiClient.delete as any).mockResolvedValue({});
      
      const result = await bankService.deleteBank(1);
      
      expect(apiClient.delete).toHaveBeenCalledWith('/banks/1');
      expect(result).toBe(true);
    });
  });
});
