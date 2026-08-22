import type { Bank } from '../types';

const TENANT_STORAGE_KEY = 'matchiaTenantSlug';

const saveTenant = (slug: string) => {
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TENANT_STORAGE_KEY, slug);
  }
};

export const getTenantSlugFromLocation = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const { hostname, search, pathname } = window.location;

  // 1. Azure : ?tenant=test1234
  const tenantFromQuery = new URLSearchParams(search)
    .get('tenant')
    ?.trim();

  if (tenantFromQuery) {
    saveTenant(tenantFromQuery);
    return tenantFromQuery;
  }

  // 2. Local : test1234.lvh.me
  if (hostname.endsWith('.lvh.me')) {
    const subdomain = hostname.slice(0, -'.lvh.me'.length);

    if (subdomain && subdomain !== 'www') {
      saveTenant(subdomain);
      return subdomain;
    }
  }

  // Sur lvh.me racine, pas de tenant
  if (hostname === 'lvh.me') {
    return null;
  }

  // 3. Azure : pendant la navigation interne du marketplace,
  // récupérer le tenant précédemment mémorisé.
  const isMarketplaceRoute =
    pathname.startsWith('/store/') ||
    pathname.startsWith('/marketplace');

  if (isMarketplaceRoute) {
    const storedTenant = sessionStorage.getItem(TENANT_STORAGE_KEY);

    if (storedTenant) {
      return storedTenant;
    }
  }

  return null;
};

export const getActiveBankSlug = (
  bank?: Bank | null
): string | undefined | null => {
  return getTenantSlugFromLocation() || bank?.slug;
};

export const getMarketplaceUrl = (
  slug: string | null | undefined,
  path = '/'
): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  const currentUrl = new URL(window.location.href);

  const isLocalLvh =
    currentUrl.hostname === 'lvh.me' ||
    currentUrl.hostname.endsWith('.lvh.me');

  const targetUrl = new URL(normalizedPath, window.location.origin);

  if (isLocalLvh) {
    targetUrl.hostname = slug
      ? `${slug}.lvh.me`
      : 'lvh.me';
  } else if (slug) {
    targetUrl.searchParams.set('tenant', slug);
  }

  return targetUrl.toString();
};