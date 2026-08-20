import { describe, it, expect, vi } from 'vitest';
import { bankTenantService } from './bankTenantService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('bankTenantService', () => {
  it('should be defined', () => {
    expect(bankTenantService).toBeDefined();
  });
});
