import { Outlet, Link } from 'react-router';
import { User, Menu, X, Building2, Loader2, Mail, Globe, MapPin, CalendarDays } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '../components/ui/Button';
import apiClient from '../api/apiClient';

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

const getSubdomain = () => {
  const hostname = window.location.hostname;

  if (/^[0-9.]+$/.test(hostname) || hostname === 'localhost') {
    return null;
  }

  const parts = hostname.split('.');
  if (parts.length >= 3) {
    const subdomain = parts[0];
    if (subdomain !== 'www') return subdomain;
  }
  return null;
};

const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};

const getExternalUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `https://${url}`;
};

const slugify = (value?: string | null) =>
  (value || '')
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export function MarketplaceLayout() {
  const bankSlug = getSubdomain();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [marketplace, setMarketplace] = useState<MarketplacePublicDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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

  const primaryColor = marketplace.primaryColor || '#2563EB';
  const secondaryColor = marketplace.secondaryColor || '#F97316';
  const logoUrl = getBackendAssetUrl(marketplace.logoImageUrl || marketplace.bankLogoUrl);
  const bannerImageUrl = getBackendAssetUrl(marketplace.banniereUrl || marketplace.bannerImageUrl);
  const stores = (marketplace.stores || [])
    .filter((store) => store.enabled !== false && store.visible !== false)
    .map((store) => ({
      id: String(store.storeId || store.id),
      name: store.name || `store-${store.storeId || store.id}`,
      slug: slugify(store.name || `store-${store.storeId || store.id}`),
      label: store.name || `Store ${store.storeId || store.id}`,
      description: store.description || '',
      banniere_url: getBackendAssetUrl(store.banniereUrl),
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
    }));

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
      className="min-h-screen flex flex-col"
      style={{ '--bank-primary': branding.primary_color, '--bank-secondary': branding.secondary_color } as any}
    >
      <header className="sticky top-0 z-30 bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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
              <span className="text-xl font-bold" style={{ color: primaryColor }}>{bankData.name}</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${encodeURIComponent(store.slug)}`}
                  className="text-foreground hover:opacity-80 transition-opacity"
                  style={{ color: primaryColor }}
                >
                  {store.label}
                </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link to="/connexion">
                <Button size="sm" variant="outline" icon={<User className="w-4 h-4" />}>
                  Se connecter
                </Button>
              </Link>
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
          <div className="md:hidden border-t border-border bg-white px-4 py-4">
            <nav className="space-y-2">
              {stores.map((store) => (
                <Link
                  key={store.id}
                  to={`/store/${encodeURIComponent(store.slug)}`}
                  className="block py-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {store.label}
                </Link>
              ))}
            </nav>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet context={{ bankData, branding, marketplace }} />
      </main>

      <footer className="bg-slate-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Contact</h3>
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
              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-300">Stores</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-400">
                {stores.length > 0 ? stores.map((store) => (
                  <Link key={store.id} to={`/store/${store.name}`} className="block transition-colors hover:text-white">
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
