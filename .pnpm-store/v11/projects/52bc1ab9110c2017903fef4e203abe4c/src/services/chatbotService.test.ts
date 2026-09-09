import { describe, it, expect, vi } from 'vitest';
import apiClient from '../api/apiClient';
import { chatbotService } from './chatbotService';

vi.mock('../api/apiClient', () => ({
  default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), patch: vi.fn() }
}));

describe('chatbotService', () => {
  it('should be defined', () => {
    expect(chatbotService).toBeDefined();
  });

  it('sends only the message and active store context', () => {
    chatbotService.sendMessage('Produits disponibles ?', 7, 'conversation-123');
    expect(apiClient.post).toHaveBeenCalledWith('/chatbot/message', { message: 'Produits disponibles ?', storeId: 7, conversationId: 'conversation-123' });
  });
});
