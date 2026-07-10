import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Bell, Search, User } from 'lucide-react';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { NotificationsPanel } from '../components/layout/NotificationsPanel';
import { AiAssistantWidget } from '../components/ai/AiAssistantWidget';
import { useBankTenant } from '../hooks/useBankTenant';
import { NotificationDto } from '../types/apiTypes';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  notifyNotificationsUpdated,
  notificationService,
} from '../services/notificationService';
import { useApp } from '../context/AppContext';

interface AdminLayoutProps {
  type: 'saas' | 'bank';
}

export function AdminLayout({ type }: AdminLayoutProps) {
  const navigate = useNavigate();
  const { currentBank } = useApp();
  const bankTenant = useBankTenant(type === 'bank');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const notificationRecipientId = type === 'bank' ? (bankTenant.marketplace?.bankId ?? currentBank?.id) : null;

  const loadNotificationData = async () => {
    if (type === 'bank' && !notificationRecipientId) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    try {
      const [countResponse, notificationsResponse] = type === 'bank'
        ? await Promise.all([
            notificationService.getBankUnreadCount(notificationRecipientId!),
            notificationService.getBankNotifications(notificationRecipientId!),
          ])
        : await Promise.all([
            notificationService.getUnreadCount(),
            notificationService.getNotifications(),
          ]);
      setUnreadCount(countResponse.data.count);
      setNotifications(notificationsResponse.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  useEffect(() => {
    loadNotificationData();

    const handleRefresh = () => loadNotificationData();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, handleRefresh);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, handleRefresh);
  }, [type, notificationRecipientId]);

  useEffect(() => {
    if (type !== 'saas') return;

    const refreshNotifications = () => {
      loadNotificationData();
    };

    const intervalId = window.setInterval(refreshNotifications, 15000);
    window.addEventListener('focus', refreshNotifications);
    document.addEventListener('visibilitychange', refreshNotifications);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', refreshNotifications);
      document.removeEventListener('visibilitychange', refreshNotifications);
    };
  }, [type, notificationRecipientId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) return;
      setIsNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = async () => {
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (nextOpen) {
      setIsLoadingNotifications(true);
      await loadNotificationData();
      setIsLoadingNotifications(false);
    }
  };

  const openNotification = async (notification: NotificationDto) => {
    try {
      if (type === 'bank') {
        await notificationService.markBankNotificationAsRead(notification.id, notificationRecipientId!);
      } else {
        await notificationService.markAsRead(notification.id);
      }
      notifyNotificationsUpdated();
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      const requestId = notification.relatedRequestId ?? notification.requestId;
      setIsNotificationsOpen(false);
      if (type === 'bank') {
        navigate(requestId ? `/bank/demandes?requestId=${requestId}` : '/bank/demandes');
      } else if (notification.type === 'PAYMENT_SUCCESS') {
        navigate(requestId ? `/saas/offers-subscriptions?requestId=${requestId}` : '/saas/offers-subscriptions');
      } else {
        navigate(requestId ? `/saas/demandes?requestId=${requestId}` : '/saas/demandes');
      }
    }
  };

  const markAllAsRead = async () => {
    try {
      if (type === 'bank') {
        await notificationService.markAllBankNotificationsAsRead(notificationRecipientId!);
      } else {
        await notificationService.markAllAsRead();
      }
      notifyNotificationsUpdated();
      await loadNotificationData();
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      if (type === 'bank') {
        await notificationService.deleteBankNotification(notificationId, notificationRecipientId!);
      } else {
        await notificationService.deleteNotification(notificationId);
      }
      notifyNotificationsUpdated();
      await loadNotificationData();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar type={type} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-border bg-card flex items-center justify-between px-6">
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative" ref={dropdownRef}>
              <button
                className="relative p-2 hover:bg-muted rounded-lg transition-colors"
                onClick={toggleNotifications}
                type="button"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-orange-500 px-1 text-white text-xs flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white shadow-lg">
                  <NotificationsPanel
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isLoading={isLoadingNotifications}
                    onMarkAllAsRead={markAllAsRead}
                    onOpenNotification={openNotification}
                    onDeleteNotification={deleteNotification}
                  />
                </div>
              )}
            </div>

            <button className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">
                  {type === 'bank' ? (currentBank?.name || 'Banque') : 'Admin'}
                </div>
                {type === 'saas' && <div className="text-xs text-muted-foreground">Super Admin</div>}
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto w-full bg-slate-50/50 px-18 py-10">
          <Outlet />
        </main>
      </div>
      {type === 'saas' && <AiAssistantWidget />}
    </div>
  );
}
