import { describe, it, expect, vi } from 'vitest';
import { productParameterService } from './productParameterService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('productParameterService', () => {
  it('should be defined', () => {
    expect(productParameterService).toBeDefined();
  });
});
