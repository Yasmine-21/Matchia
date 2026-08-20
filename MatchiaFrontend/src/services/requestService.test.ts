import { describe, it, expect, vi } from 'vitest';
import { requestService } from './requestService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('requestService', () => {
  it('should be defined', () => {
    expect(requestService).toBeDefined();
  });
});
