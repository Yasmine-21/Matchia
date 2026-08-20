import { describe, it, expect, vi } from 'vitest';
import { storeService } from './storeService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('storeService', () => {
  it('should be defined', () => {
    expect(storeService).toBeDefined();
  });
});
