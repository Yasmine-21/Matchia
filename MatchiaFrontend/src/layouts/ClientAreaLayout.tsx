import '../styles/ClientArea.css';
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router';
import { Bell, ChevronDown, FileText, LayoutDashboard, LogOut, Menu, Settings, Store, UserRound, X } from 'lucide-react';
import { MatchiaLogo } from '../components/brand/MatchiaLogo';
import { NotificationsPanel } from '../components/layout/NotificationsPanel';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { financingRequestService, type ClientProfile } from '../services/financingRequestService';
import apiClient from '../api/apiClient';
import type { MarketplacePublicDto, NotificationDto } from '../types/apiTypes';
import { getBackendAssetUrl, getTenantSlugFromLocation } from '../utils/tenant';
import { NOTIFICATIONS_UPDATED_EVENT, notifyNotificationsUpdated, notificationService } from '../services/notificationService';

const initials = (name?: string | null) => (name || 'Client')
  .split(' ')
  .filter(Boolean)
  .slice(0, 2)
  .map((part) => part[0]?.toUpperCase())
  .join('');

export function ClientAreaLayout() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const tenantSlug = getTenantSlugFromLocation();
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  const loadNotificationData = async () => {
    try {
      // Fetch the list first: this endpoint also restores a notification for
      // any financing decision made while the client was away.
      const notificationsResponse = await notificationService.getClientNotifications();
      const countResponse = await notificationService.getClientUnreadCount();
      setNotifications(notificationsResponse.data);
      setUnreadCount(countResponse.data.count);
    } catch (error) {
      console.warn('Unable to load client notifications:', error);
    }
  };

  useEffect(() => {
    let active = true;
    void financingRequestService.profile()
      .then((response) => { if (active) setProfile(response.data); })
      .catch((error) => console.warn('Unable to load client profile for shell:', error));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const refreshProfile = () => { void financingRequestService.profile().then((response) => setProfile(response.data)).catch(() => undefined); };
    window.addEventListener('matchia-client-profile-updated', refreshProfile);
    return () => window.removeEventListener('matchia-client-profile-updated', refreshProfile);
  }, []);

  useEffect(() => {
    void loadNotificationData();
    const refreshNotifications = () => { void loadNotificationData(); };
    const intervalId = window.setInterval(refreshNotifications, 15_000);
    window.addEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications);
    window.addEventListener('focus', refreshNotifications);
    return () => { window.clearInterval(intervalId); window.removeEventListener(NOTIFICATIONS_UPDATED_EVENT, refreshNotifications); window.removeEventListener('focus', refreshNotifications); };
  }, []);

  useEffect(() => {
    const closeHeaderMenus = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) setIsNotificationsOpen(false);
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) setIsProfileMenuOpen(false);
    };
    document.addEventListener('mousedown', closeHeaderMenus);
    return () => document.removeEventListener('mousedown', closeHeaderMenus);
  }, []);

  useEffect(() => {
    let active = true;
    if (!tenantSlug) return () => { active = false; };
    void apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/public/slug/${tenantSlug}`)
      .then((response) => { if (active) setMarketplace(response.data); })
      .catch((error) => console.warn('Unable to load client marketplace theme:', error));
    return () => { active = false; };
  }, [tenantSlug]);

  const primaryColor = marketplace?.primaryColor || '#7C3AED';
  const secondaryColor = marketplace?.secondaryColor || '#9333EA';
  const shellStyles = useMemo(() => ({
    '--client-primary': primaryColor,
    '--client-secondary': secondaryColor,
    '--client-primary-soft': `${primaryColor}14`,
    '--client-primary-border': `${primaryColor}2b`,
  } as CSSProperties), [primaryColor, secondaryColor]);
  const name = profile?.fullName || currentUser?.name || 'Client';
  const photoUrl = getBackendAssetUrl(profile?.contactImageUrl || currentUser?.contactImageUrl);
  const marketplaceLogo = getBackendAssetUrl(marketplace?.logoImageUrl || marketplace?.bankLogoUrl);

  const logout = async () => {
    await authService.logout();
    navigate('/connexion', { replace: true });
  };

  const closeMenu = () => setMobileMenuOpen(false);
  const toggleNotifications = async () => { const nextOpen = !isNotificationsOpen; setIsNotificationsOpen(nextOpen); if (nextOpen) { setIsLoadingNotifications(true); await loadNotificationData(); setIsLoadingNotifications(false); } };
  const openNotification = async (notification: NotificationDto) => { try { await notificationService.markClientNotificationAsRead(notification.id); notifyNotificationsUpdated(); } catch (error) { console.warn('Unable to mark client notification as read:', error); } finally { setIsNotificationsOpen(false); const requestId = notification.relatedRequestId ?? notification.requestId; if (requestId) navigate(`/client/financing-requests/${requestId}`); } };
  const markAllNotificationsAsRead = async () => { try { await notificationService.markAllClientNotificationsAsRead(); notifyNotificationsUpdated(); await loadNotificationData(); } catch (error) { console.warn('Unable to mark client notifications as read:', error); } };
  const deleteNotification = async (id: number) => { try { await notificationService.deleteClientNotification(id); notifyNotificationsUpdated(); await loadNotificationData(); } catch (error) { console.warn('Unable to delete client notification:', error); } };

  return (
    <div className="client-shell" style={shellStyles}>
      <header className="client-header">
        <Link className="client-brand" to="/client/dashboard">
          {marketplaceLogo ? (
            <img className="client-brand-logo" src={marketplaceLogo} alt={marketplace?.bankName || 'Marketplace'} />
          ) : (
            <MatchiaLogo variant="icon" markClassName="client-brand-fallback" />
          )}
          <span>Mon espace client</span>
        </Link>

        <div className="client-header-actions">
          <div className="client-notifications" ref={notificationsRef}>
            <button className="client-bell" type="button" onClick={() => void toggleNotifications()} aria-label="Notifications" aria-expanded={isNotificationsOpen}>
              <Bell aria-hidden="true" />
              {unreadCount > 0 && <span className="client-notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>}
            </button>
            {isNotificationsOpen && <div className="client-notifications-popover"><NotificationsPanel className="client-notifications-panel" notifications={notifications} unreadCount={unreadCount} isLoading={isLoadingNotifications} onMarkAllAsRead={() => void markAllNotificationsAsRead()} onOpenNotification={notification => void openNotification(notification)} onDeleteNotification={id => void deleteNotification(id)} /></div>}
          </div>
          <div className="client-profile-menu" ref={profileMenuRef}>
            <button className="client-header-profile" type="button" onClick={() => setIsProfileMenuOpen((open) => !open)} aria-expanded={isProfileMenuOpen} aria-haspopup="menu">
              <ClientAvatar name={name} photoUrl={photoUrl} className="client-header-avatar" />
              <span className="client-header-name">{name}</span>
              <ChevronDown className={`client-header-chevron${isProfileMenuOpen ? ' client-header-chevron-open' : ''}`} aria-hidden="true" />
            </button>
            {isProfileMenuOpen && <div className="client-profile-popover" role="menu"><button type="button" role="menuitem" className="client-profile-menu-item" onClick={() => { setIsProfileMenuOpen(false); navigate('/client/profile'); }}><Settings aria-hidden="true" />Paramètres du profil</button><button type="button" role="menuitem" className="client-profile-menu-item client-profile-menu-logout" onClick={() => void logout()}><LogOut aria-hidden="true" />Déconnexion</button></div>}
          </div>
          <button
            className="client-mobile-menu-button"
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </button>
        </div>
      </header>

      <div className="client-body">
        <aside className={`client-sidebar${mobileMenuOpen ? ' client-sidebar-open' : ''}`}>
          <div className="client-sidebar-profile">
            <ClientAvatar name={name} photoUrl={photoUrl} className="client-sidebar-avatar" />
            <p className="client-sidebar-name">{name}</p>
            <p className="client-sidebar-role">Client</p>
          </div>

          <nav className="client-nav" aria-label="Navigation de l’espace client">
            <ClientNavLink to="/client/dashboard" onClick={closeMenu} icon={<LayoutDashboard />}>Tableau de bord</ClientNavLink>
            <ClientNavLink to="/client/financing-requests" onClick={closeMenu} icon={<FileText />}>Mes demandes</ClientNavLink>
            <ClientNavLink to="/client/profile" onClick={closeMenu} icon={<UserRound />}>Mon profil</ClientNavLink>
          </nav>

          <div className="client-sidebar-footer">
            <Link className="client-marketplace-link" to="/" onClick={closeMenu}>
              <Store aria-hidden="true" />
              Voir la marketplace
            </Link>
            <button className="client-logout" type="button" onClick={() => void logout()}>
              <LogOut aria-hidden="true" />
              Déconnexion
            </button>
          </div>
        </aside>

        {mobileMenuOpen && <button className="client-mobile-backdrop" type="button" onClick={closeMenu} aria-label="Fermer le menu" />}

        <main className="client-main">
          <Outlet context={{ clientProfile: profile, marketplace }} />
        </main>
      </div>
    </div>
  );
}

function ClientNavLink({ to, icon, children, onClick }: { to: string; icon: ReactNode; children: ReactNode; onClick: () => void }) {
  return (
    <NavLink
      to={to}
      end={to === '/client/dashboard'}
      onClick={onClick}
      className={({ isActive }) => `client-nav-link${isActive ? ' client-nav-link-active' : ''}`}
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}

function ClientAvatar({ name, photoUrl, className }: { name: string; photoUrl: string; className: string }) {
  return photoUrl ? (
    <img className={className} src={photoUrl} alt={`Photo de profil de ${name}`} />
  ) : (
    <span className={`${className} client-avatar-fallback`} aria-label={`Profil de ${name}`}>{initials(name)}</span>
  );
}
