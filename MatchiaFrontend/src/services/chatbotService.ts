import apiClient from '../api/apiClient';

export const chatbotService = {
  sendMessage: (message: string) =>
    apiClient.post<{ reply: string }>('/chatbot/message', { message }),
};
