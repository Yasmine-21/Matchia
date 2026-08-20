import { describe, it, expect, vi } from 'vitest';
import { chatbotService } from './chatbotService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('chatbotService', () => {
  it('should be defined', () => {
    expect(chatbotService).toBeDefined();
  });
});
