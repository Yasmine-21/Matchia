import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import {
  Box,
  Bell,
  Building2,
  ChevronLeft,
  CreditCard,
  ExternalLink,
  FileText,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { MatchiaLogo } from '../brand/MatchiaLogo';
import { NotificationsPanel } from './NotificationsPanel';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  notifyNotificationsUpdated,
  notificationService,
} from '../../services/notificationService';
import { NotificationDto } from '../../types/apiTypes';
import { useBankTenant } from '../../hooks/useBankTenant';
import { getBackendAssetUrl } from '../../utils/tenant';

interface SidebarItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface AdminSidebarProps {
  type: 'saas' | 'bank';
}

export function AdminSidebar({ type }: AdminSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const bankTenant = useBankTenant(type === 'bank');
  const notificationRecipientId = type === 'bank' ? bankTenant.marketplace?.bankId ?? null : null;

  const saasSections: SidebarSection[] = [
    {
      title: 'GÉNÉRAL',
      items: [
        { label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, path: '/saas/dashboard' },
      ],
    },
    {
      title: 'GESTION',
      items: [
        { label: 'Banques', icon: <Building2 className="w-5 h-5" />, path: '/saas/banques' },
        { label: 'Demandes', icon: <FileText className="w-5 h-5" />, path: '/saas/demandes' },
        { label: 'Contenu marketplace', icon: <FileText className="w-5 h-5" />, path: '/saas/gestion-contenu' },
        { label: 'Stores & Modules', icon: <Store className="w-5 h-5" />, path: '/saas/storesmodules' },
        { label: 'Utilisateurs & Rôles', icon: <Users className="w-5 h-5" />, path: '/saas/utilisateurs' },
      ],
    },
    {
      title: 'PLATEFORME',
      items: [
        { label: 'Marketplace', icon: <Store className="w-5 h-5" />, path: '/saas/marketplaces' },
        { label: 'Sécurité et Certificats', icon: <ShieldCheck className="w-5 h-5" />, path: '/saas/certificates' },
        { label: 'Offres et Abonnements', icon: <CreditCard className="w-5 h-5" />, path: '/saas/offers-subscriptions' },
      ],
    },
    {
      title: 'ANALYSE',
      items: [
        { label: 'Audit & Logs', icon: <FileText className="w-5 h-5" />, path: '/saas/audit' },
      ],
    },
    {
      title: 'SYSTÈME',
      items: [
        { label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/saas/parametres' },
      ],
    },
  ];

  const bankSections: SidebarSection[] = [
    
    {
      title: '',
      items: [
        { label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, path: '/bank/dashboard' },
        { label: 'Utilisateurs', icon: <Users className="w-5 h-5" />, path: '/bank/utilisateurs' },
        { label: 'Stores assignés', icon: <Store className="w-5 h-5" />, path: '/bank/stores' },
        { label: 'Modules assignés', icon: <Box className="w-5 h-5" />, path: '/bank/modules' },
        { label: 'Manage content', icon: <FileText className="w-5 h-5" />, path: '/bank/gestion-contenu' },
        { label: 'Produits', icon: <Package className="w-5 h-5" />, path: '/bank/products' },
        { label: 'Mes demandes', icon: <FileText className="w-5 h-5" />, path: '/bank/demandes' },
        { label: 'Abonnement', icon: <CreditCard className="w-5 h-5" />, path: '/bank/abonnement' },
        { label: 'Branding', icon: <Settings className="w-5 h-5" />, path: '/bank/branding' },
        { label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/bank/parametres' },
      ],
    },
  ];

  const sections = type === 'saas' ? saasSections : bankSections;

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
    const handleRefresh = () => {
      loadNotificationData();
    };

    handleRefresh();
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
      if (!notificationsRef.current || notificationsRef.current.contains(event.target as Node)) return;
      setShowNotifications(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!showNotifications) return;
    setIsLoadingNotifications(true);
    loadNotificationData().finally(() => setIsLoadingNotifications(false));
  }, [showNotifications, type, notificationRecipientId]);

  const toggleNotifications = () => {
    setShowNotifications((current) => !current);
  };

  const openNotificationDetails = async (notification: NotificationDto) => {
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
      setShowNotifications(false);
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
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            {type === 'bank' ? (
              bankTenant.branding.logo_image_url ? (
                <img
                  src={getBackendAssetUrl(bankTenant.branding.logo_image_url)}
                  alt={bankTenant.marketplace?.bankName || 'Banque'}
                  className="h-10 w-10 rounded-lg border border-sidebar-border object-contain bg-white p-1"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-white text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              )
            ) : (
              <MatchiaLogo showText={false} markClassName="h-10 w-auto max-w-[150px]" />
            )}
            <div>
              <div className="text-sm font-semibold text-foreground">
                {type === 'bank' && bankTenant.marketplace?.bankName ? bankTenant.marketplace.bankName : 'Matchia'}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 p-3 overflow-y-auto">
        {sections.map((section) => (
          <div key={section.title || 'bank'} className="mb-4">
            {!collapsed && section.title && (
              <div className="text-xs font-semibold text-gray-400 mt-6 mb-2 uppercase tracking-wider">
                {section.title}
              </div>
            )}
            <ul className="space-y-1">
              {section.items.map((item) => {
                const normalizedPath = item.path?.split('?')[0];
                const isActive = location.pathname === normalizedPath;
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path || '#'}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                        isActive
                          ? 'bg-orange-50 text-orange-500 border-l-4 border-orange-500'
                          : 'text-sidebar-foreground hover:bg-sidebar-accent'
                      }`}
                    >
                      {item.icon}
                      {!collapsed && <span className="text-sm">{item.label}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-sidebar-border space-y-1">
        {type === 'bank' && (
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {bankTenant.branding.logo_image_url ? (
              <img
                src={getBackendAssetUrl(bankTenant.branding.logo_image_url)}
                alt={bankTenant.marketplace?.bankName || 'Marketplace'}
                className="h-5 w-5 rounded-sm object-contain"
              />
            ) : (
              <ExternalLink className="w-5 h-5" />
            )}
            {!collapsed && <span className="text-sm">View Marketplace</span>}
          </a>
        )}

        <div className="relative" ref={notificationsRef}>
          <button
            type="button"
            onClick={toggleNotifications}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            <Bell className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Notifications</span>}
            {unreadCount > 0 && (
              <span className={`${collapsed ? 'absolute right-2 top-1' : 'ml-auto'} rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white`}>
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <NotificationsPanel
              notifications={notifications}
              unreadCount={unreadCount}
              isLoading={isLoadingNotifications}
              onMarkAllAsRead={markAllAsRead}
              onOpenNotification={openNotificationDetails}
              onDeleteNotification={deleteNotification}
              className="absolute bottom-0 left-full z-50 ml-3 w-[460px] rounded-xl border border-border bg-white shadow-lg"
            />
          )}
        </div>

        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
