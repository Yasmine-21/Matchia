import { describe, it, expect, vi } from 'vitest';
import { aiAssistantService } from './aiAssistantService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('aiAssistantService', () => {
  it('should be defined', () => {
    expect(aiAssistantService).toBeDefined();
  });
});
