import { describe, it, expect, vi } from 'vitest';
import { marketplaceContentService } from './marketplaceContentService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('marketplaceContentService', () => {
  it('should be defined', () => {
    expect(marketplaceContentService).toBeDefined();
  });
});
