import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import {
  UserRound,
  Menu,
  X,
  Building2,
  Loader2,
  Mail,
  Globe,
  MapPin,
  CalendarDays,
  Smartphone,
  HeartPulse,
  CarFront,
  ChevronDown,
  Bell,
  FileText,
  LayoutDashboard,
  LogOut,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import apiClient, { resolveApiUrl } from '../api/apiClient';
import { useApp } from '../context/AppContext';
import { authService } from '../services/authService';
import { Chatbot } from '../components/Chatbot';
import { isChatbotModule } from '../utils/moduleVisibility';
import { getMarketplaceUrl, getTenantSlugFromLocation } from '../utils/tenant';

interface MarketplaceModuleDetail {
  id: number;
  moduleId?: number | null;
  name?: string | null;
  category?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
}

interface MarketplaceStoreDetail {
  id: number;
  storeId?: number | null;
  name?: string | null;
  description?: string | null;
  banniereUrl?: string | null;
  bannerImageUrl?: string | null;
  price?: number | string | null;
  enabled?: boolean | null;
  visible?: boolean | null;
  modules?: MarketplaceModuleDetail[];
}

interface MarketplacePublicDto {
  id: number;
  bankId?: number | null;
  bankName?: string | null;
  bankSlug?: string | null;
  bankLogoUrl?: string | null;
  bankEmail?: string | null;
  bankCountry?: string | null;
  bankWebsiteUrl?: string | null;
  bankDescription?: string | null;
  bankEstablishedYear?: number | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  homepageTitle?: string | null;
  welcomeText?: string | null;
  banniereUrl?: string | null;
  bannerImageUrl?: string | null;
  footerText?: string | null;
  logoImageUrl?: string | null;
  stores?: MarketplaceStoreDetail[];
}

const getExternalUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const getPlatformUrl = (path: string) => getMarketplaceUrl(null, path);

const slugify = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const getStoreMeta = (name?: string | null) => {
  const normalized = `${name || ''}`.toLowerCase();

  if (normalized.includes('mobile') || normalized.includes('smart')) {
    return { icon: Smartphone, label: 'mobile' };
  }

  if (normalized.includes('medical') || normalized.includes('médical') || normalized.includes('sant')) {
    return { icon: HeartPulse, label: 'medical' };
  }

  if (normalized.includes('vehicle') || normalized.includes('vehicule') || normalized.includes('auto') || normalized.includes('car')) {
    return { icon: CarFront, label: 'vehicule' };
  }

  return { icon: Building2, label: 'immobilier' };
};

export function MarketplaceLayout() {
  const bankSlug = getTenantSlugFromLocation();
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [clientMenuOpen, setClientMenuOpen] = useState(false);
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const primaryColor = marketplace?.primaryColor || '#2563EB';
  const secondaryColor = marketplace?.secondaryColor || '#F97316';
  const logoUrl = resolveApiUrl(marketplace?.logoImageUrl || marketplace?.bankLogoUrl);
  const bannerImageUrl = resolveApiUrl(marketplace?.banniereUrl || marketplace?.bannerImageUrl);
  const stores = useMemo(() => (
    (marketplace?.stores || [])
      .filter((store) => store.enabled !== false && store.visible !== false)
      .map((store) => ({
        id: String(store.storeId || store.id),
        name: store.name || `store-${store.storeId || store.id}`,
        slug: slugify(store.name || `store-${store.storeId || store.id}`),
        label: store.name || `Store ${store.storeId || store.id}`,
        description: store.description || '',
        banniere_url: resolveApiUrl(store.bannerImageUrl || store.banniereUrl),
        bannerImageUrl: resolveApiUrl(store.bannerImageUrl || store.banniereUrl),
        price: store.price,
        modules: (store.modules || [])
          .filter((module) => module.enabled !== false && module.visible !== false)
          .map((module) => ({
            id: String(module.moduleId || module.id),
            name: module.name || `module-${module.moduleId || module.id}`,
            label: module.name || `Module ${module.moduleId || module.id}`,
            category: module.category,
            price: module.price,
          })),
      }))
  ), [marketplace]);
  const headerStores = stores;
  const activeStoreSlug = useMemo(() => {
    if (location.pathname === '/' && headerStores[0]) {
      return headerStores[0].slug;
    }

    const match = location.pathname.match(/^\/store\/([^/]+)/);
    return match ? decodeURIComponent(match[1]) : headerStores[0]?.slug || '';
  }, [headerStores, location.pathname]);
  const activeStore = useMemo(
    () => headerStores.find((store) => store.slug === activeStoreSlug),
    [activeStoreSlug, headerStores],
  );
  const isStoreRoute = /^\/store\/[^/]+/.test(location.pathname);
  const isChatbotEnabledForActiveStore = Boolean(
    isStoreRoute && activeStore?.modules?.some(isChatbotModule),
  );
  const isClient = currentUser?.role === 'CLIENT';
  const isAuthenticated = Boolean(currentUser);
  const profileName = currentUser?.name?.trim() || 'Mon profil';
  const profileFirstName = profileName.split(/\s+/)[0] || profileName;
  const profileAvatar = resolveApiUrl(currentUser?.contactImageUrl);
  const logout = async () => {
    await authService.logout();
    setClientMenuOpen(false);
    setMobileMenuOpen(false);
    navigate('/');
  };

  useEffect(() => {
    if (!bankSlug) return;

    const loadMarketplace = async () => {
      try {
        setIsLoading(true);
        setHasError(false);
        const response = await apiClient.get<MarketplacePublicDto>(`/api/admin/marketplaces/public/slug/${bankSlug}`);
        setMarketplace(response.data);
      } catch (error) {
        console.error('Failed to load marketplace:', error);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    loadMarketplace();
  }, [bankSlug]);

  if (!bankSlug) {
    return <div className="p-8 text-center text-red-500">Erreur : Aucun identifiant de marketplace trouve.</div>;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement de la marketplace...
      </div>
    );
  }

  if (hasError || !marketplace) {
    return <div className="p-8 text-center">Marketplace non trouvee</div>;
  }

  const bankData = {
    id: String(marketplace.bankId || marketplace.id),
    name: marketplace.bankName || marketplace.bankSlug || bankSlug,
    slug: marketplace.bankSlug || bankSlug,
    logo_url: logoUrl,
    email: marketplace.bankEmail || '',
    country: marketplace.bankCountry || '',
    website_url: marketplace.bankWebsiteUrl || '',
    description: marketplace.bankDescription || marketplace.welcomeText || '',
    establishedYear: marketplace.bankEstablishedYear || undefined,
    established_year: marketplace.bankEstablishedYear || undefined,
    stores,
  };

  const branding = {
    primary_color: primaryColor,
    secondary_color: secondaryColor,
    homepage_title: marketplace.homepageTitle || `Bienvenue sur la marketplace de ${bankData.name}`,
    welcome_text: marketplace.welcomeText || marketplace.bankDescription || 'Decouvrez nos solutions de financement.',
    banner_image_url: bannerImageUrl,
    footer_text: marketplace.footerText || `(c) 2026 ${bankData.name}. Tous droits reserves.`,
    logo_image_url: logoUrl,
  };

  return (
    <div
      className="min-h-screen flex flex-col bg-[#f8f6f2]"
      style={{ '--bank-primary': branding.primary_color, '--bank-secondary': branding.secondary_color } as any}
    >
      <header className="sticky top-0 z-30 bg-transparent px-4 pt-4">
        <div className="mx-auto max-w-7xl rounded-[26px] border border-white/70 bg-white/95 px-4 py-3 shadow-[0_12px_34px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link to="/" className="flex items-center gap-3">
              {branding.logo_image_url ? (
                <img
                  src={branding.logo_image_url}
                  alt={bankData.name}
                  className="h-10 w-10 object-contain rounded-lg border border-slate-200 bg-white p-1"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100" style={{ color: primaryColor }}>
                  <Building2 className="h-5 w-5" />
                </div>
              )}
              <span className="text-lg font-bold text-slate-900 sm:text-xl" style={{ color: primaryColor }}>
                {bankData.name}
              </span>
            </Link>

            <nav className="hidden flex-1 items-center justify-center gap-3 overflow-x-auto lg:flex">
              {headerStores.map((store) => {
                const meta = getStoreMeta(store.name || store.label);
                const ActiveIcon = meta.icon;
                const isActive = store.slug === activeStoreSlug;

                return (
                  <Link
                    key={store.id}
                    to={`/store/${encodeURIComponent(store.slug)}`}
                    className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                      isActive
                        ? 'border-transparent text-white shadow-[0_10px_22px_rgba(155,17,26,0.26)]'
                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : undefined}
                  >
                    <ActiveIcon className="h-4 w-4" />
                    <span>{store.label || store.name}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative hidden md:flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    type="button"
                    onClick={() => setClientMenuOpen((open) => !open)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                    aria-expanded={clientMenuOpen}
                  >
                    {profileAvatar ? <img src={profileAvatar} alt="" className="h-7 w-7 rounded-full object-cover" /> : <span className="flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ backgroundColor: primaryColor }}>{profileFirstName.charAt(0).toUpperCase()}</span>}
                    {profileFirstName}<ChevronDown className="h-4 w-4" />
                  </button>
                  {clientMenuOpen && <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    {isClient && <><Link onClick={() => setClientMenuOpen(false)} to="/client/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" />Tableau de bord</Link><Link onClick={() => setClientMenuOpen(false)} to="/client/profile" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><UserRound className="h-4 w-4" />Mon profil</Link><Link onClick={() => setClientMenuOpen(false)} to="/client/financing-requests" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><FileText className="h-4 w-4" />Mes demandes</Link><Link onClick={() => setClientMenuOpen(false)} to="/client/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><Bell className="h-4 w-4" />Notifications</Link></>}
                    {currentUser?.role === 'DEALER_ADMIN' && <a onClick={() => setClientMenuOpen(false)} href={getPlatformUrl('/dealer/dashboard')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" />Tableau de bord concessionnaire</a>}
                    {currentUser?.role === 'ADMIN_BANK' && <Link onClick={() => setClientMenuOpen(false)} to="/bank/dashboard" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" />Tableau de bord banque</Link>}
                    {currentUser?.role === 'ADMIN_SAAS' && <a onClick={() => setClientMenuOpen(false)} href={getPlatformUrl('/saas/dashboard')} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"><LayoutDashboard className="h-4 w-4" />Tableau de bord SaaS</a>}
                    <button type="button" onClick={() => void logout()} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><LogOut className="h-4 w-4" />Déconnexion</button>
                  </div>}
                </>
              ) : <Link to="/connexion"><Button size="sm" className="rounded-full border-0 px-5 text-white shadow-[0_10px_20px_rgba(155,17,26,0.28)] hover:opacity-95" style={{ backgroundColor: primaryColor }} icon={<UserRound className="w-4 h-4" />}>Se connecter</Button></Link>}
            </div>

            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="mx-auto mt-3 max-w-7xl rounded-[22px] border border-slate-200 bg-white px-4 py-4 shadow-[0_10px_30px_rgba(15,23,42,0.08)] lg:hidden">
            <nav className="grid gap-2">
              {stores.map((store) => {
                const meta = getStoreMeta(store.name || store.label);
                const ActiveIcon = meta.icon;
                const isActive = store.slug === activeStoreSlug;

                return (
                  <Link
                    key={store.id}
                    to={`/store/${encodeURIComponent(store.slug)}`}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium ${
                      isActive
                        ? 'border-transparent text-white'
                        : 'border-slate-200 bg-white text-slate-700'
                    }`}
                    style={isActive ? { backgroundColor: primaryColor } : undefined}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <ActiveIcon className="h-4 w-4" />
                    <span>{store.label || store.name}</span>
                  </Link>
                );
              })}
            </nav>
            {isAuthenticated ? <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">{isClient && <><Link to="/client/dashboard" onClick={() => setMobileMenuOpen(false)} className="block"><Button size="sm" className="w-full" style={{ backgroundColor: primaryColor }} icon={<LayoutDashboard className="h-4 w-4" />}>Tableau de bord</Button></Link><Link to="/client/profile" onClick={() => setMobileMenuOpen(false)} className="block text-center text-sm text-slate-700">Mon profil</Link><Link to="/client/financing-requests" onClick={() => setMobileMenuOpen(false)} className="block text-center text-sm text-slate-700">Mes demandes</Link></>}{currentUser?.role === 'DEALER_ADMIN' && <a href={getPlatformUrl('/dealer/dashboard')} onClick={() => setMobileMenuOpen(false)} className="block"><Button size="sm" className="w-full" style={{ backgroundColor: primaryColor }} icon={<LayoutDashboard className="h-4 w-4" />}>Tableau de bord concessionnaire</Button></a>}{currentUser?.role === 'ADMIN_BANK' && <Link to="/bank/dashboard" onClick={() => setMobileMenuOpen(false)} className="block"><Button size="sm" className="w-full" style={{ backgroundColor: primaryColor }} icon={<LayoutDashboard className="h-4 w-4" />}>Tableau de bord banque</Button></Link>}<button type="button" onClick={() => void logout()} className="block w-full text-center text-sm text-rose-600">Déconnexion</button></div> : <Link to="/connexion" onClick={() => setMobileMenuOpen(false)} className="mt-4 block"><Button size="sm" className="w-full rounded-full border-0 px-5 text-white" style={{ backgroundColor: primaryColor }} icon={<UserRound className="w-4 h-4" />}>Se connecter</Button></Link>}
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ bankData, branding, marketplace }} />
      </main>
      {isChatbotEnabledForActiveStore && (
        <Chatbot storeName={activeStore?.label || activeStore?.name} primaryColor={primaryColor} />
      )}

      <footer className="bg-[linear-gradient(180deg,#0f172a_0%,#10192d_100%)] text-white py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.3fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                {branding.logo_image_url ? (
                  <img
                    src={branding.logo_image_url}
                    alt={bankData.name}
                    className="h-11 w-11 rounded-lg border border-white/10 bg-white object-contain p-1"
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10">
                    <Building2 className="h-5 w-5" />
                  </div>
                )}
                <div>
                  <div className="text-lg font-bold">{bankData.name}</div>
                  {bankData.country && <div className="text-sm text-slate-400">{bankData.country}</div>}
                </div>
              </div>
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-400">
                {bankData.description || branding.welcome_text}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Contact</h3>
              <div className="mt-4 space-y-3 text-sm text-slate-400">
                {bankData.email && (
                  <a href={`mailto:${bankData.email}`} className="flex items-center gap-2 transition-colors hover:text-white">
                    <Mail className="h-4 w-4" />
                    <span className="break-all">{bankData.email}</span>
                  </a>
                )}
                {bankData.website_url && (
                  <a
                    href={getExternalUrl(bankData.website_url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 transition-colors hover:text-white"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="break-all">{bankData.website_url}</span>
                  </a>
                )}
                {bankData.country && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{bankData.country}</span>
                  </div>
                )}
                {bankData.establishedYear && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>Depuis {bankData.establishedYear}</span>
                  </div>
                )}
                {!bankData.email && !bankData.website_url && !bankData.country && !bankData.establishedYear && (
                  <p>Aucune information de contact disponible.</p>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-300">Stores</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                {stores.length > 0 ? stores.map((store) => (
                  <Link key={store.id} to={`/store/${encodeURIComponent(store.slug)}`} className="block transition-colors hover:text-white">
                    {store.label}
                  </Link>
                )) : (
                  <p>Aucun store disponible.</p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-slate-500">
            <p>{branding.footer_text}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
