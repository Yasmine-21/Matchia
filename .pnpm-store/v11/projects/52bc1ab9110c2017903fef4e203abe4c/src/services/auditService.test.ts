import { describe, it, expect, vi } from 'vitest';
import { auditService } from './auditService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('auditService', () => {
  it('should be defined', () => {
    expect(auditService).toBeDefined();
  });
});
