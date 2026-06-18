import apiClient from '../api/apiClient';
import { NotificationDto } from '../types/apiTypes';

export const NOTIFICATIONS_UPDATED_EVENT = 'matchia:notifications-updated';

export const notifyNotificationsUpdated = () => {
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED_EVENT));
};

export const notificationService = {
  getUnreadCount: () =>
    apiClient.get<{ count: number }>('/api/admin/notifications/unread-count'),

  getNotifications: () =>
    apiClient.get<NotificationDto[]>('/api/admin/notifications'),

  markAsRead: (id: number) =>
    apiClient.patch<NotificationDto>(`/api/admin/notifications/${id}/read`),

  markAllAsRead: () =>
    apiClient.patch<NotificationDto[]>('/api/admin/notifications/read-all'),

  deleteNotification: (id: number) =>
    apiClient.delete<void>(`/api/admin/notifications/${id}`),

  getBankUnreadCount: (recipientId: number) =>
    apiClient.get<{ count: number }>(`/api/bank/notifications/unread-count?recipientId=${recipientId}`),

  getBankNotifications: (recipientId: number) =>
    apiClient.get<NotificationDto[]>(`/api/bank/notifications?recipientId=${recipientId}`),

  markBankNotificationAsRead: (id: number, recipientId: number) =>
    apiClient.patch<NotificationDto>(`/api/bank/notifications/${id}/read?recipientId=${recipientId}`),

  markAllBankNotificationsAsRead: (recipientId: number) =>
    apiClient.patch<NotificationDto[]>(`/api/bank/notifications/read-all?recipientId=${recipientId}`),

  deleteBankNotification: (id: number, recipientId: number) =>
    apiClient.delete<void>(`/api/bank/notifications/${id}?recipientId=${recipientId}`),
};
