import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTenantSlugFromLocation } from '../utils/tenant';
import {
  getStoredAccessToken,
  notifyAuthSessionCleared,
  setStoredAccessToken,
} from '../services/sessionStorage';

export const getApiBaseUrl = (): string => {
  // 1. En production / Azure, utiliser l'URL injectée au build par Vite
  const configuredUrl = import.meta.env.VITE_API_URL?.trim();

  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  // 2. Fallback serveur / test
  if (typeof window === 'undefined') {
    return 'http://localhost:8081';
  }

  const { hostname, protocol } = window.location;

  // 3. Développement local classique
  if (hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
    return 'http://localhost:8081';
  }

  // 4. Développement multi-tenant local avec lvh.me
  // Ex:
  // lvh.me:5173            -> lvh.me:8081
  // test1234.lvh.me:5173   -> test1234.lvh.me:8081
  if (hostname === 'lvh.me' || hostname.endsWith('.lvh.me')) {
    return `${protocol}//${hostname}:8081`;
  }

  // 5. Fallback de sécurité pour environnement non configuré
  return 'http://localhost:8081';
};

/**
 * Permet de construire une URL complète vers une ressource backend
 * comme une image, un logo ou un fichier uploadé.
 */
export const resolveApiUrl = (url?: string | null): string => {
  if (!url) {
    return '';
  }

  // Si l'URL est déjà absolue, ne pas la modifier
  if (
    url.startsWith('http://') ||
    url.startsWith('https://') ||
    url.startsWith('data:')
  ) {
    return url;
  }

  const baseUrl = getApiBaseUrl();

  return `${baseUrl}${url.startsWith('/') ? url : `/${url}`}`;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredAccessToken();

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    /**
     * Pour FormData, il ne faut pas définir manuellement Content-Type.
     * Le navigateur ajoutera lui-même le boundary multipart/form-data.
     */
    const isFormData =
      typeof FormData !== 'undefined' &&
      config.data instanceof FormData;

    if (isFormData && config.headers) {
      const headers = config.headers as Record<string, unknown> & {
        delete?: (headerName: string) => void;
      };

      if (typeof headers.delete === 'function') {
        headers.delete('Content-Type');
        headers.delete('content-type');
      } else {
        delete headers['Content-Type'];
        delete headers['content-type'];
      }
    }

    /**
     * Ajout du tenant / slug bancaire dans les headers.
     */
    const tenantSlug = getTenantSlugFromLocation();

    if (tenantSlug) {
      config.headers = config.headers ?? {};
      config.headers['X-Bank-Slug'] = tenantSlug;
    }

    return config;
  }
);

apiClient.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as
      | (InternalAxiosRequestConfig & { _retry?: boolean })
      | undefined;

    const responseStatus = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    /**
     * Éviter une boucle infinie de refresh token.
     */
    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/refresh') ||
      requestUrl.includes('/api/auth/logout') ||
      requestUrl.includes('/api/auth/forgot-password') ||
      requestUrl.includes('/api/auth/reset-password');

    if (
      responseStatus === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !isAuthEndpoint
    ) {
      originalRequest._retry = true;

      try {
        const refreshResponse = await axios.post(
          `${getApiBaseUrl()}/api/auth/refresh`,
          {},
          {
            withCredentials: true,
          }
        );

        const refreshedToken =
          refreshResponse.data?.accessToken ||
          refreshResponse.data?.token;

        if (refreshedToken) {
          setStoredAccessToken(refreshedToken);

          originalRequest.headers =
            originalRequest.headers ?? {};

          originalRequest.headers.Authorization =
            `Bearer ${refreshedToken}`;

          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.warn(
          'Token refresh failed, clearing session.',
          refreshError
        );

        notifyAuthSessionCleared();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;