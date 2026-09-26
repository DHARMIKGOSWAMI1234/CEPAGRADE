import axios from 'axios';

// Default to env or origin
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for deep ML pipeline
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor to automatically attach JWT Bearer token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('onionvision_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // If unauthorized and token exists, it might be expired
      const token = localStorage.getItem('onionvision_token');
      if (token && !error.config?.url?.includes('/api/auth/login')) {
        localStorage.removeItem('onionvision_token');
        localStorage.removeItem('onionvision_user');
      }
    }
    return Promise.reject(error);
  }
);

/**
 * Returns full URL for an API media asset path (e.g., /api/inspections/INS-XXX/image).
 */
export function getAssetUrl(relativePath: string | null | undefined): string {
  if (!relativePath) return '';
  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }
  return `${BASE_URL}${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
}
