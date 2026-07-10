import apiClient from '../api/apiClient';
import type { AiAskRequest, AiAskResponse } from '../types/apiTypes';

export const aiAssistantService = {
  ask: (payload: AiAskRequest) =>
    apiClient.post<AiAskResponse>('/api/ai-assistant/ask', payload),
};
