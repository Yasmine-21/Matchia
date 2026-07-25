import apiClient from '../api/apiClient';
import { RequestDto, SubscriptionOverviewDto } from '../types/apiTypes';

export const subscriptionService = {
  getOverview: () => apiClient.get<SubscriptionOverviewDto>('/api/subscriptions'),
  createRenewalRequest: (subscriptionId: number, payload: { bankId: number; createdBy?: string }) =>
    apiClient.post<RequestDto>(`/api/subscriptions/${subscriptionId}/renewal-requests`, payload),
};
