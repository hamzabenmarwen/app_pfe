import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';

const api = axios.create({
  baseURL: '/api',
});

function getPersistedAccessToken(): string | null {
  try {
    const raw = window.localStorage.getItem('assiette-gala-auth');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string | null };
    };

    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

function setAuthorizationHeader(config: any, token: string): void {
  if (!config.headers) {
    config.headers = {};
  }

  if (typeof config.headers.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  config.headers.Authorization = `Bearer ${token}`;
}

// Request interceptor - add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken || getPersistedAccessToken();
    if (token) {
      setAuthorizationHeader(config, token);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = useAuthStore.getState().refreshToken;
        if (refreshToken) {
          const response = await axios.post('/api/auth/refresh', { refreshToken });
          const { accessToken, refreshToken: newRefreshToken } = response.data.data;
          
          useAuthStore.getState().setTokens(accessToken, newRefreshToken);
          setAuthorizationHeader(originalRequest, accessToken);
          
          return api(originalRequest);
        }
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;
