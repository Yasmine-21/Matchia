import apiClient from '../api/apiClient';
import { MonthlyRevenueDto, SubscriptionExpiryAlertDto } from '../types/apiTypes';

export const paymentService = {
  getMonthlyRevenue: () => apiClient.get<MonthlyRevenueDto[]>('/api/payments/monthly-revenue'),
  getExpiringSubscriptions: () => apiClient.get<SubscriptionExpiryAlertDto[]>('/api/payments/expiring-subscriptions'),
};
