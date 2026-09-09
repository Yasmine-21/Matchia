import { describe, it, expect, vi } from 'vitest';
import { dealerService } from './dealerService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('dealerService', () => {
  it('should be defined', () => {
    expect(dealerService).toBeDefined();
  });
});
