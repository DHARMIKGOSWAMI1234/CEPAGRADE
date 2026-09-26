import axios from 'axios';
import { auth } from '../lib/firebase';

// Default to env or origin
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 60000, // 60s timeout for deep ML pipeline
  headers: {
    'Accept': 'application/json',
  },
});

// Request interceptor to automatically attach Firebase ID Bearer token
apiClient.interceptors.request.use(async (config) => {
  // If Firebase is initialized and restoring auth from storage, wait for ready state
  if (auth && typeof (auth as any).authStateReady === 'function') {
    try {
      await (auth as any).authStateReady();
    } catch {}
  }

  let token = localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
  if (auth?.currentUser) {
    try {
      // Ensure token is fresh (re-authenticating seamlessly in background if nearing expiry)
      const freshToken = await auth.currentUser.getIdToken();
      if (freshToken) {
        token = freshToken;
        localStorage.setItem('cepagrade_token', freshToken);
      }
    } catch {
      // Fallback to cached token if network lookup fails
    }
  }

  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor to handle 401 unauthorized with single background refresh retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      auth?.currentUser &&
      !originalRequest.url?.includes('/api/auth/login')
    ) {
      originalRequest._retry = true;
      try {
        const freshToken = await auth.currentUser.getIdToken(true);
        if (freshToken) {
          localStorage.setItem('cepagrade_token', freshToken);
          originalRequest.headers = originalRequest.headers || {};
          originalRequest.headers.Authorization = `Bearer ${freshToken}`;
          return apiClient(originalRequest);
        }
      } catch {
        // Fall through to clear session if refresh failed
      }
    }

    if (error.response?.status === 401) {
      // If unauthorized and cannot be refreshed, clear expired session
      const token = localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
      if (token && !originalRequest?.url?.includes('/api/auth/login')) {
        localStorage.removeItem('cepagrade_token');
        localStorage.removeItem('cepagrade_user');
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
  let url = relativePath;
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `${BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
  }
  const token = localStorage.getItem('cepagrade_token') || localStorage.getItem('onionvision_token');
  if (token && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}token=${encodeURIComponent(token)}`;
  }
  return url;
}
