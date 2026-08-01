import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { getTenantSlugFromLocation } from '../utils/tenant';
import { getStoredAccessToken, notifyAuthSessionCleared, setStoredAccessToken } from '../services/sessionStorage';

export const getApiBaseUrl = () => {
  if (typeof window === 'undefined') {
    return 'http://localhost:8081';
  }

  const { hostname, protocol } = window.location;
  if (hostname === 'localhost' || /^[0-9.]+$/.test(hostname)) {
    return 'http://localhost:8081';
  }

  return `${protocol}//${hostname}:8081`;
};

const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredAccessToken();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const isFormData = typeof FormData !== 'undefined' && config.data instanceof FormData;

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

  const tenantSlug = getTenantSlugFromLocation();
  if (tenantSlug) {
    config.headers = config.headers ?? {};
    config.headers['X-Bank-Slug'] = tenantSlug;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;
    const responseStatus = error.response?.status;
    const requestUrl = originalRequest?.url || '';

    const isAuthEndpoint =
      requestUrl.includes('/api/auth/login') ||
      requestUrl.includes('/api/auth/refresh') ||
      requestUrl.includes('/api/auth/logout') ||
      requestUrl.includes('/api/auth/forgot-password') ||
      requestUrl.includes('/api/auth/reset-password');

    if (responseStatus === 401 && originalRequest && !originalRequest._retry && !isAuthEndpoint) {
      originalRequest._retry = true;
      try {
        const refreshResponse = await axios.post(
          `${getApiBaseUrl()}/api/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const refreshedToken = refreshResponse.data?.accessToken || refreshResponse.data?.token;
        if (refreshedToken) {
          setStoredAccessToken(refreshedToken);
          originalRequest.headers = originalRequest.headers ?? {};
          originalRequest.headers.Authorization = `Bearer ${refreshedToken}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        console.warn('Token refresh failed, clearing session.', refreshError);
        notifyAuthSessionCleared();
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
