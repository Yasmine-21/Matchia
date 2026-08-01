import { useEffect, useRef, useState } from 'react';
import { Outlet, useNavigate } from 'react-router';
import { Bell, LogOut, Search, Settings, User } from 'lucide-react';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { NotificationsPanel } from '../components/layout/NotificationsPanel';
import { AiAssistantWidget } from '../components/ai/AiAssistantWidget';
import { useBankTenant } from '../hooks/useBankTenant';
import { getBackendAssetUrl } from '../utils/tenant';
import { authService } from '../services/authService';
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
  const { currentUser } = useApp();
  const bankTenant = useBankTenant(type === 'bank');
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const notificationRecipientId = type === 'bank'
    ? (bankTenant.marketplace?.bankId || currentBank?.id || null)
    : null;
  const profileName = type === 'saas'
    ? (currentUser?.name ?? '')
    : (currentUser?.name || (currentBank?.name || 'Banque'));
  const profileEmailLabel = type === 'saas'
    ? (currentUser?.email ?? '')
    : (currentUser?.email || 'Admin banque');
  const profileImageUrl = getBackendAssetUrl(currentUser?.contactImageUrl || null);

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

  useEffect(() => {
    const handleProfileClickOutside = (event: MouseEvent) => {
      if (!profileMenuRef.current || profileMenuRef.current.contains(event.target as Node)) return;
      setIsProfileMenuOpen(false);
    };

    document.addEventListener('mousedown', handleProfileClickOutside);
    return () => document.removeEventListener('mousedown', handleProfileClickOutside);
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

  const toggleProfileMenu = () => {
    setIsProfileMenuOpen((current) => !current);
  };

  const openProfileSettings = () => {
    setIsProfileMenuOpen(false);
    navigate(type === 'saas' ? '/saas/profil' : '/bank/profil');
  };

  const handleLogout = async () => {
    setIsProfileMenuOpen(false);
    await authService.logout();
    navigate('/connexion');
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

            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={toggleProfileMenu}
                className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-muted"
              >
              {profileImageUrl ? (
                <img
                  src={profileImageUrl}
                  alt={profileName}
                  className="h-10 w-10 rounded-full border border-border object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
                  <User className="h-5 w-5" />
                </div>
              )}
              <div className="text-left hidden md:block">
                <div className="text-sm font-semibold leading-tight text-slate-900">{profileName}</div>
                <div className="text-xs text-muted-foreground leading-tight">{profileEmailLabel}</div>
              </div>
              </button>

              {isProfileMenuOpen && (
                <div className="absolute right-0 top-14 z-50 w-64 rounded-xl border border-border bg-white p-2 shadow-xl">
                  <button
                    type="button"
                    onClick={openProfileSettings}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    <Settings className="h-4 w-4 text-primary" />
                    <span>Paramètres du profil</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Déconnexion</span>
                  </button>
                </div>
              )}
            </div>
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
