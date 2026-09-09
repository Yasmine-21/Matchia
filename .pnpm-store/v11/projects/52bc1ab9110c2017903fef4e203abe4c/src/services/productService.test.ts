import { describe, it, expect, vi } from 'vitest';
import { productService } from './productService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('productService', () => {
  it('should be defined', () => {
    expect(productService).toBeDefined();
  });
});
