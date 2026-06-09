import { Link, useLocation, useNavigate } from 'react-router';
import {
  LayoutDashboard,
  Building2,
  FileText,
  Store,
  Box,
  Users,
  Settings,
  ChevronLeft,
  Bell,
  LogOut,
  ExternalLink,
  CreditCard,
  ShieldCheck,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { MatchiaLogo } from '../brand/MatchiaLogo';
import {
  NOTIFICATIONS_UPDATED_EVENT,
  notificationService,
} from '../../services/notificationService';
import { NotificationDto } from '../../types/apiTypes';

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
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);

  // Le const bankSlug a été supprimé ici car nous n'en avons plus besoin pour le lien

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

  const bankItems: SidebarItem[] = [
    { label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, path: '/bank/dashboard' },
    { label: 'Users', icon: <Users className="w-5 h-5" />, path: '/bank/utilisateurs' },
    { label: 'Assigned Stores', icon: <Store className="w-5 h-5" />, path: '/bank/stores' },
    { label: 'Assigned Modules', icon: <Box className="w-5 h-5" />, path: '/bank/modules' },
    { label: 'Personalization', icon: <Settings className="w-5 h-5" />, path: '/bank/branding' },
    { label: 'Settings', icon: <Settings className="w-5 h-5" />, path: '/bank/parametres' },
  ];

  const sections = type === 'saas' ? saasSections : [{ title: '', items: bankItems }];

  const loadNotifications = async () => {
    if (type !== 'saas') return;

    setIsLoadingNotifications(true);
    try {
      const response = await notificationService.getNotifications();
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  useEffect(() => {
    if (type !== 'saas') return;

    const loadPendingCount = () => {
      notificationService.getPendingCount()
        .then((response) => setPendingRequestsCount(response.data.count))
        .catch((error) => console.error('Failed to load pending requests count:', error));
    };

    loadPendingCount();
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, loadPendingCount);
    return () => window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, loadPendingCount);
  }, [type]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!notificationsRef.current || notificationsRef.current.contains(event.target as Node)) return;
      setShowNotifications(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showNotifications) {
      loadNotifications();
    }
  }, [showNotifications]);

  const toggleNotifications = () => {
    if (type !== 'saas') return;
    setShowNotifications((current) => !current);
  };

  const openNotificationDetails = async (notification: NotificationDto) => {
    try {
      await notificationService.markAsRead(notification.id);
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    } finally {
      setShowNotifications(false);
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
    <motion.aside
      animate={{ width: collapsed ? 80 : 260 }}
      className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col sticky top-0"
    >
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between">
        {!collapsed && (
          <div className="flex items-center gap-3">
            <MatchiaLogo showText={false} markClassName="h-10 w-auto max-w-[150px]" />
            <div>
              <div className="text-xs text-muted-foreground">
                {type === 'saas' ? 'SaaS Admin' : 'Banque Admin'}
              </div>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 hover:bg-sidebar-accent rounded-lg transition-colors"
        >
          <ChevronLeft
            className={`w-5 h-5 transition-transform ${collapsed ? 'rotate-180' : ''}`}
          />
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
                const isActive = location.pathname === item.path;
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
                      {!collapsed && item.path === '/saas/demandes' && pendingRequestsCount > 0 && (
                        <span className="ml-auto rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
                          {pendingRequestsCount}
                        </span>
                      )}
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
          /* CORRECTION INTEGREE : On pointe vers "/" */
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
          >
            <ExternalLink className="w-5 h-5" />
            {!collapsed && <span className="text-sm">View Marketplace</span>}
          </a>
        )}
        {type === 'saas' ? (
          <div className="relative" ref={notificationsRef}>
            <button
              type="button"
              onClick={toggleNotifications}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground"
            >
              <Bell className="w-5 h-5" />
              {!collapsed && <span className="text-sm">Notifications</span>}
              {pendingRequestsCount > 0 && (
                <span className={`${collapsed ? 'absolute right-2 top-1' : 'ml-auto'} rounded-full bg-orange-500 px-2 py-0.5 text-xs font-semibold text-white`}>
                  {pendingRequestsCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute bottom-0 left-full z-50 ml-3 w-[340px] rounded-xl border border-border bg-white shadow-lg">
                <div className="border-b border-border px-4 py-3">
                  <div className="font-semibold text-gray-900">Notifications</div>
                  <div className="text-xs text-muted-foreground">
                    {pendingRequestsCount > 0 ? `${pendingRequestsCount} demande(s) en attente` : 'Aucune demande en attente'}
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
                          onClick={() => openNotificationDetails(notification)}
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
        ) : (
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-sidebar-accent transition-colors text-sidebar-foreground">
            <Bell className="w-5 h-5" />
            {!collapsed && <span className="text-sm">Notifications</span>}
          </button>
        )}
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors">
          <LogOut className="w-5 h-5" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  );
}
