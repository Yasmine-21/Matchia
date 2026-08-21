import type { Bank } from '../types';

export const getTenantSlugFromLocation = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const hostname = window.location.hostname;

  if (hostname === 'lvh.me') {
    return null;
  }

  if (hostname.endsWith('.lvh.me')) {
    const subdomain = hostname.slice(0, -'.lvh.me'.length);
    if (subdomain && subdomain !== 'www') {
      return subdomain;
    }
  }

  const tenantFromQuery = new URLSearchParams(window.location.search)
    .get('tenant')
    ?.trim();

  if (tenantFromQuery) {
    return tenantFromQuery;
  }

  return null;
};

export const getActiveBankSlug = (bank?: Bank | null) => getTenantSlugFromLocation() || bank?.slug;

export const getMarketplaceUrl = (slug: string | null | undefined, path = '/') => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  if (typeof window === 'undefined') {
    return normalizedPath;
  }

  const url = new URL(window.location.origin);
  const isLocalLvh = url.hostname === 'lvh.me' || url.hostname.endsWith('.lvh.me');

  url.pathname = normalizedPath;
  url.search = '';

  if (isLocalLvh) {
    url.hostname = slug ? `${slug}.lvh.me` : 'lvh.me';
  } else if (slug) {
    url.searchParams.set('tenant', slug);
  }

  return `${url.origin}${url.pathname}${url.search}`;
};
