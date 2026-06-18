import axios from 'axios';
import { getTenantSlugFromLocation } from '../utils/tenant';

const apiClient = axios.create({
  // L'URL de base de votre backend Spring Boot
  baseURL: 'http://localhost:8081',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('matchia_token');

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  const tenantSlug = getTenantSlugFromLocation();
  if (tenantSlug) {
    config.headers = config.headers ?? {};
    config.headers['X-Bank-Slug'] = tenantSlug;
  }

  return config;
});

export default apiClient;
