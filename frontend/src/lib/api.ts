import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import toast from 'react-hot-toast';

/**
 * API Error Types
 */
export interface ApiError {
  success: false;
  error: string;
  code?: string;
  message: string;
  details?: Record<string, string[]>;
  requestId?: string;
}

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Request deduplication store
 */
const pendingRequests: Map<string, Promise<unknown>> = new Map();

/**
 * Generate request key for deduplication
 */
function getRequestKey(config: AxiosRequestConfig): string {
  return `${config.method}:${config.url}:${JSON.stringify(config.params || {})}:${JSON.stringify(config.data || {})}`;
}

const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // 30 second timeout
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Get persisted access token from localStorage
 */
function getPersistedAccessToken(): string | null {
  try {
    const raw = window.sessionStorage.getItem('assiette-gala-auth') || window.localStorage.getItem('assiette-gala-auth');
    if (!raw) return null;

    const parsed = JSON.parse(raw) as {
      state?: { accessToken?: string | null };
    };

    return parsed?.state?.accessToken ?? null;
  } catch {
    return null;
  }
}

/**
 * Set authorization header on request config
 */
function setAuthorizationHeader(config: AxiosRequestConfig, token: string): void {
  if (!config.headers) {
    config.headers = {};
  }

  if (typeof config.headers.set === 'function') {
    config.headers.set('Authorization', `Bearer ${token}`);
    return;
  }

  config.headers.Authorization = `Bearer ${token}`;
}


/**
 * Handle API errors with user-friendly messages
 */
function handleApiError(error: AxiosError<ApiError>): never {
  const response = error.response;
  
  if (!response) {
    // Network error
    toast.error('Network error. Please check your connection.');
    throw new Error('Network error');
  }

  const data = response.data;
  const status = response.status;

  switch (status) {
    case 400:
      toast.error(data?.message || 'Invalid request');
      break;
    case 401:
      toast.error('Session expired. Please login again.');
      break;
    case 403:
      toast.error('Access denied');
      break;
    case 404:
      toast.error(data?.message || 'Resource not found');
      break;
    case 409:
      toast.error(data?.message || 'Conflict occurred');
      break;
    case 422:
      // Validation errors - handled by form components
      break;
    case 429:
      toast.error('Too many requests. Please try again later.');
      break;
    case 500:
    case 502:
    case 503:
    case 504:
      toast.error('Server error. Please try again later.');
      break;
    default:
      toast.error(data?.message || 'An error occurred');
  }

  throw error;
}

// Request interceptor - add auth token and deduplication
api.interceptors.request.use(
  async (config) => {
    const token = useAuthStore.getState().accessToken || getPersistedAccessToken();
    if (token) {
      setAuthorizationHeader(config, token);
    }
    
    // Add request ID for tracing
    config.headers = config.headers || {};
    config.headers['X-Request-Id'] = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh, retries, and error handling
api.interceptors.response.use(
  (response) => {
    // Clean up pending request
    const key = getRequestKey(response.config);
    pendingRequests.delete(key);
    
    return response;
  },
  async (error) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean; _retryCount?: number };
    
    // Clean up pending request
    const key = getRequestKey(originalRequest);
    pendingRequests.delete(key);
    
    // Handle 401 with token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const response = await axios.post('/api/auth/refresh', {}, { withCredentials: true });
        const { accessToken } = response.data.data;

        useAuthStore.getState().setTokens(accessToken);
        setAuthorizationHeader(originalRequest, accessToken);

        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        throw refreshError;
      }
    }
    
    // Retry on network errors or 5xx (idempotent requests only)
    const isIdempotent = ['get', 'head', 'options', 'put', 'delete'].includes(
      originalRequest.method?.toLowerCase() || ''
    );
    
    if (isIdempotent && !originalRequest._retryCount) {
      originalRequest._retryCount = 0;
    }
    
    if (
      isIdempotent &&
      originalRequest._retryCount !== undefined &&
      originalRequest._retryCount < 3 &&
      (!error.response || error.response.status >= 500)
    ) {
      originalRequest._retryCount++;
      const delay = Math.pow(2, originalRequest._retryCount) * 1000;
      
      await new Promise(resolve => setTimeout(resolve, delay));
      return api(originalRequest);
    }
    
    // Handle other errors
    return handleApiError(error);
  }
);

/**
 * Enhanced API methods with better error handling
 */
export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const key = getRequestKey({ ...config, method: 'get', url });

    const existing = pendingRequests.get(key) as Promise<T> | undefined;
    if (existing) {
      return existing;
    }
    
    const promise: Promise<T> = api
      .get<ApiResponse<T>>(url, config)
      .then((response) => response.data.data);
    pendingRequests.set(key, promise);
    
    try {
      return await promise;
    } finally {
      pendingRequests.delete(key);
    }
  },
  
  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.post<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.put<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.patch<ApiResponse<T>>(url, data, config);
    return response.data.data;
  },
  
  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await api.delete<ApiResponse<T>>(url, config);
    return response.data.data;
  },
};

export default api;
export type { AxiosError, AxiosResponse };

