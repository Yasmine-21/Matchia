import type { Bank } from '../types';

const TENANT_STORAGE_KEY = 'matchiaTenantSlug';

const saveTenant = (slug: string) => {
  if (typeof window !== 'undefined' && slug) {
    sessionStorage.setItem(TENANT_STORAGE_KEY, slug);
  }
};

export const isLocalLvhEnvironment = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const hostname = window.location.hostname;

  return hostname === 'lvh.me' || hostname.endsWith('.lvh.me');
};

export const getTenantSlugFromLocation = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const { hostname, search } = window.location;

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

  // 3. Navigation interne Azure :
  // récupération du dernier tenant connu
  const storedTenant = sessionStorage.getItem(TENANT_STORAGE_KEY);

  if (storedTenant) {
    return storedTenant;
  }

  return null;
};

export const getActiveBankSlug = (
  bank?: Bank | null
): string | null | undefined =>
  getTenantSlugFromLocation() || bank?.slug;

/**
 * Indique quelles routes appartiennent à un tenant.
 */
export const isTenantScopedPath = (pathname: string): boolean => {
  if (pathname === '/') {
    return true;
  }

  const tenantRoutes = [
    '/store',
    '/marketplace',
    '/connexion',
    '/inscription',
    '/bank',
    '/client',
  ];

  return tenantRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`)
  );
};

/**
 * Utilisé avec navigate().
 *
 * Azure :
 * /bank/dashboard -> /bank/dashboard?tenant=test1234
 *
 * Local :
 * /bank/dashboard reste /bank/dashboard
 * car le tenant est déjà dans test1234.lvh.me
 */
export const getTenantPath = (
  path: string,
  slug?: string | null
): string => {
  if (typeof window === 'undefined') {
    return path;
  }

  const tenant = slug || getTenantSlugFromLocation();

  if (isLocalLvhEnvironment() || !tenant) {
    return path;
  }

  const url = new URL(path, window.location.origin);

  url.searchParams.set('tenant', tenant);

  return `${url.pathname}${url.search}${url.hash}`;
};

/**
 * URL complète d'une marketplace.
 */
export const getMarketplaceUrl = (
  slug: string | null | undefined,
  path = '/'
): string => {
  const normalizedPath = path.startsWith('/')
    ? path
    : `/${path}`;

  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  const currentUrl = new URL(window.location.href);

  if (isLocalLvhEnvironment()) {
    currentUrl.hostname = slug
      ? `${slug}.lvh.me`
      : 'lvh.me';

    currentUrl.pathname = normalizedPath;
    currentUrl.search = '';
    currentUrl.hash = '';

    return currentUrl.toString();
  }

  const targetUrl = new URL(
    normalizedPath,
    window.location.origin
  );

  if (slug) {
    targetUrl.searchParams.set('tenant', slug);
  }

  return targetUrl.toString();
};