import type { Bank } from '../types';

export const getTenantSlugFromLocation = () => {
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

export const getActiveBankSlug = (bank?: Bank | null) => getTenantSlugFromLocation() || bank?.slug;

export const getBackendAssetUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  return `http://localhost:8081${url.startsWith('/') ? url : `/${url}`}`;
};
