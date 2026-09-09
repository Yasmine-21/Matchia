import { describe, it, expect, vi } from 'vitest';
import { notificationService } from './notificationService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('notificationService', () => {
  it('should be defined', () => {
    expect(notificationService).toBeDefined();
  });
});
