import { describe, it, expect, vi } from 'vitest';
import { moduleService } from './moduleService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('moduleService', () => {
  it('should be defined', () => {
    expect(moduleService).toBeDefined();
  });
});
