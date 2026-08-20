import { describe, it, expect, vi } from 'vitest';
import { contentService } from './contentService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('contentService', () => {
  it('should be defined', () => {
    expect(contentService).toBeDefined();
  });
});
