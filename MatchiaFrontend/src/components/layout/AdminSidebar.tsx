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
  Handshake,
  LayoutDashboard,
  LogOut,
  Package,
  Send,
  Settings,
  ShieldCheck,
  Store,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { authService } from '../../services/authService';
import { NotificationsPanel } from './NotificationsPanel';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  notifyNotificationsUpdated,
  notificationService,
} from '../../services/notificationService';
import { NotificationDto } from '../../types/apiTypes';
import { useBankTenant } from '../../hooks/useBankTenant';
import { resolveApiUrl } from '../../api/apiClient';
import { useApp } from '../../context/AppContext';
import { MatchiaLogo } from '../brand/MatchiaLogo';
import {
  DEALER_BRANDING_UPDATED_EVENT,
  dealerService,
  type DealerView,
} from '../../services/dealerService';

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
  type: 'saas' | 'bank' | 'dealer';
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
  const [connectedDealer, setConnectedDealer] = useState<DealerView | null>(null);
  const [dealerLogoFailed, setDealerLogoFailed] = useState(false);
  const { currentUser } = useApp();
  const bankTenant = useBankTenant(type === 'bank');
  const notificationRecipientId = type === 'bank'
    ? (bankTenant.marketplace?.bankId || null)
    : type === 'dealer' ? Number(currentUser?.id || 0) || null : null;

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
        { label: 'Concessionnaires', icon: <Handshake className="w-5 h-5" />, path: '/saas/concessionnaires' },
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
        { label: 'Concessionnaires', icon: <Handshake className="w-5 h-5" />, path: '/bank/concessionnaires' },
        { label: 'Mes demandes', icon: <FileText className="w-5 h-5" />, path: '/bank/demandes' },
        { label: 'Financements', icon: <FileText className="w-5 h-5" />, path: '/bank/financing-requests' },
        { label: 'Abonnement', icon: <CreditCard className="w-5 h-5" />, path: '/bank/abonnement' },
        { label: 'Branding', icon: <Settings className="w-5 h-5" />, path: '/bank/branding' },
        { label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/bank/parametres' },
      ],
    },
  ];

  const dealerSections: SidebarSection[] = [{
    title: '',
    items: [
      { label: 'Tableau de bord', icon: <LayoutDashboard className="w-5 h-5" />, path: '/dealer/dashboard' },
      { label: 'Partenariats', icon: <Handshake className="w-5 h-5" />, path: '/dealer/partenariats' },
      { label: 'Contrats', icon: <FileText className="w-5 h-5" />, path: '/dealer/contrats' },
      { label: 'Produits', icon: <Package className="w-5 h-5" />, path: '/dealer/produits' },
      { label: 'Publications', icon: <Send className="w-5 h-5" />, path: '/dealer/publications' },
      { label: 'Profil', icon: <Settings className="w-5 h-5" />, path: '/dealer/profil' },
      { label: 'Paramètres', icon: <Settings className="w-5 h-5" />, path: '/dealer/parametres' },
    ],
  }];

  const sections = type === 'saas' ? saasSections : type === 'bank' ? bankSections : dealerSections;

  useEffect(() => {
    if (type !== 'dealer') {
      setConnectedDealer(null);
      return;
    }

    let active = true;
    const loadConnectedDealer = () => {
      dealerService.me().then((response) => {
        if (!active) return;
        setConnectedDealer(response.data);
        setDealerLogoFailed(false);
      })
      .catch((error) => {
        if (!active) return;
        setConnectedDealer(null);
        console.error('Failed to load connected dealer branding:', error);
      });
    };

    loadConnectedDealer();
    window.addEventListener(DEALER_BRANDING_UPDATED_EVENT, loadConnectedDealer);

    return () => {
      active = false;
      window.removeEventListener(DEALER_BRANDING_UPDATED_EVENT, loadConnectedDealer);
    };
  }, [type, currentUser?.id]);

  const loadNotificationData = async () => {
    if (type !== 'saas' && !notificationRecipientId) {
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
        : type === 'dealer' ? await Promise.all([
            notificationService.getDealerUnreadCount(),
            notificationService.getDealerNotifications(),
          ]) : await Promise.all([
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
      } else if (type === 'dealer') {
        await notificationService.markDealerNotificationAsRead(notification.id);
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
        const isFinancingRequest = notification.title === 'Nouvelle demande de financement';
        navigate(isFinancingRequest && requestId ? `/bank/financing-requests/${requestId}` : '/bank/demandes');
      } else if (type === 'dealer') {
        navigate('/dealer/publications');
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
      } else if (type === 'dealer') {
        await notificationService.markAllDealerNotificationsAsRead();
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
      } else if (type === 'dealer') {
        await notificationService.deleteDealerNotification(notificationId);
      } else {
        await notificationService.deleteNotification(notificationId);
      }
      notifyNotificationsUpdated();
      await loadNotificationData();
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleSignOut = async () => {
    await authService.logout();
    navigate('/connexion');
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className={`flex flex-1 items-center ${type === 'saas' || type === 'dealer' ? 'justify-center' : 'gap-3'}`}>
            {type === 'bank' ? (
              bankTenant.branding.logo_image_url ? (
                <img
                  src={resolveApiUrl(bankTenant.branding.logo_image_url)}
                  alt={bankTenant.marketplace?.bankName || 'Banque'}
                  className="h-10 w-10 rounded-lg border border-sidebar-border object-contain bg-white p-1"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-sidebar-border bg-white text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
              )
            ) : type === 'dealer' ? (
              connectedDealer?.logoUrl && !dealerLogoFailed ? (
                <img
                  src={resolveApiUrl(connectedDealer.logoUrl)}
                  alt={`Logo ${connectedDealer.companyName}`}
                  className="h-16 w-full max-w-[205px] object-contain"
                  onError={() => setDealerLogoFailed(true)}
                />
              ) : (
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-sidebar-border bg-white text-primary">
                    <Store className="h-5 w-5" />
                  </div>
                  <div className="truncate text-sm font-semibold text-foreground">
                    {connectedDealer?.companyName || 'Espace concessionnaire'}
                  </div>
                </div>
              )
            ) : (
              <div className="flex items-center justify-center gap-2.5">
                <MatchiaLogo variant="full" markClassName="w-[180px] max-w-full" />
              </div>
            )}
            {type === 'bank' && (
              <div>
                <div className="text-sm font-semibold text-foreground">
                  {bankTenant.marketplace?.bankName || 'Banque'}
                </div>
              </div>
            )}
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            {bankTenant.branding.logo_image_url ? (
              <img
                src={resolveApiUrl(bankTenant.branding.logo_image_url)}
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

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Déconnexion</span>}
        </button>
      </div>
    </motion.aside>
  );
}
