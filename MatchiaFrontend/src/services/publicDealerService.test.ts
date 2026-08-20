import { describe, it, expect, vi } from 'vitest';
import { publicDealerService } from './publicDealerService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('publicDealerService', () => {
  it('should be defined', () => {
    expect(publicDealerService).toBeDefined();
  });
});
