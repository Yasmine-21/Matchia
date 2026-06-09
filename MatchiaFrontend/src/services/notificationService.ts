import apiClient from '../api/apiClient';
import { NotificationDto } from '../types/apiTypes';

export const NOTIFICATIONS_UPDATED_EVENT = 'matchia:notifications-updated';

export const notifyNotificationsUpdated = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

export const notificationService = {
  getPendingCount: () =>
    apiClient.get<{ count: number }>('/api/admin/join-requests/pending-count'),

  getNotifications: () =>
    apiClient.get<NotificationDto[]>('/api/admin/notifications'),

  markAsRead: (id: number) =>
    apiClient.patch<NotificationDto>(`/api/admin/notifications/${id}/read`),
};
