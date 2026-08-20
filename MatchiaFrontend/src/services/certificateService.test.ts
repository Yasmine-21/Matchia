import { describe, it, expect, vi } from 'vitest';
import { certificateService } from './certificateService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('certificateService', () => {
  it('should be defined', () => {
    expect(certificateService).toBeDefined();
  });
});
