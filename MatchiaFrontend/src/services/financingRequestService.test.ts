import { describe, it, expect, vi } from 'vitest';
import { financingRequestService } from './financingRequestService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('financingRequestService', () => {
  it('should be defined', () => {
    expect(financingRequestService).toBeDefined();
  });
});
