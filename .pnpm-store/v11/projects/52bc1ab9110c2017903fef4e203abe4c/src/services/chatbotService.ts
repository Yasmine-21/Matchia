import apiClient from '../api/apiClient';

export const chatbotService = {
  sendMessage: (message: string, storeId?: number, conversationId?: string) =>
    apiClient.post<{ reply: string; intent: string }>('/chatbot/message', { message, storeId, conversationId }),
};
