import { Outlet, useNavigate } from 'react-router';
import { useEffect, useRef, useState } from 'react';
import { AdminSidebar } from '../components/layout/AdminSidebar';
import { Bell, Search, User } from 'lucide-react';
import { Chatbot } from '../components/Chatbot';
import { NotificationDto } from '../types/apiTypes';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  notificationService,
} from '../services/notificationService';

interface AdminLayoutProps {
  type: 'saas' | 'bank';
}

export function AdminLayout({ type }: AdminLayoutProps) {
  const navigate = useNavigate();
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  const loadNotificationData = async () => {
    if (type !== 'saas') return;

    try {
      const [countResponse, notificationsResponse] = await Promise.all([
        notificationService.getPendingCount(),
        notificationService.getNotifications(),
      ]);
      setNotificationCount(countResponse.data.count);
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
  }, [type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!dropdownRef.current || dropdownRef.current.contains(event.target as Node)) return;
      setIsNotificationsOpen(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleNotifications = async () => {
    if (type !== 'saas') return;
    const nextOpen = !isNotificationsOpen;
    setIsNotificationsOpen(nextOpen);

    if (nextOpen) {
      setIsLoadingNotifications(true);
      await loadNotificationData();
      setIsLoadingNotifications(false);
    }
  };

  const openRequest = async (notification: NotificationDto) => {
    try {
      await notificationService.markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setIsNotificationsOpen(false);
      navigate('/saas/demandes');
    }
  };

  const formatNotificationDate = (value?: string) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
                {type === 'saas' && notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-5 h-5 rounded-full bg-orange-500 px-1 text-white text-xs flex items-center justify-center">
                    {notificationCount}
                  </span>
                )}
              </button>
              {type === 'saas' && isNotificationsOpen && (
                <div className="absolute right-0 top-12 z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-white shadow-lg">
                  <div className="border-b border-border px-4 py-3">
                    <div className="font-semibold text-gray-900">Notifications</div>
                    <div className="text-xs text-muted-foreground">
                      {notificationCount > 0 ? `${notificationCount} demande(s) en attente` : 'Aucune demande en attente'}
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto p-2">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune nouvelle notification</div>
                    ) : (
                      notifications.map((notification) => (
                        <div
                          key={notification.id}
                          className="mb-2 rounded-lg border border-orange-100 bg-orange-50/70 p-3 last:mb-0"
                        >
                          <div>
                            <div className="text-sm font-semibold text-gray-900">{notification.title || 'Nouvelle demande'}</div>
                            <div className="mt-1 text-sm text-gray-600">{notification.message}</div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {formatNotificationDate(notification.createdAt)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => openRequest(notification)}
                            className="mt-3 text-sm font-medium text-orange-600 hover:text-orange-700"
                          >
                            Voir détails
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <button className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg transition-colors">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left hidden md:block">
                <div className="text-sm font-medium">Admin</div>
                <div className="text-xs text-muted-foreground">
                  {type === 'saas' ? 'Super Admin' : 'Bank Admin'}
                </div>
              </div>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-auto w-full px-18 py-10 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
      {type === 'saas' && <Chatbot />}
    </div>
  );
}
