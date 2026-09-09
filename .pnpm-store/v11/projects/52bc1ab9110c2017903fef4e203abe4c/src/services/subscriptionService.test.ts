import { describe, it, expect, vi } from 'vitest';
import { subscriptionService } from './subscriptionService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('subscriptionService', () => {
  it('should be defined', () => {
    expect(subscriptionService).toBeDefined();
  });
});
