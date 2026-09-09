import { describe, it, expect, vi } from 'vitest';
import { paymentService } from './paymentService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('paymentService', () => {
  it('should be defined', () => {
    expect(paymentService).toBeDefined();
  });
});
