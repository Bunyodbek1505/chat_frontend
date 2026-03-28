import axios, { AxiosError, type AxiosRequestConfig, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../../store/auth.store';
import { queryClient } from './query-client';

const RAW_API_BASE =
  import.meta.env.VITE_API_BASE_URL ??
  (typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:4001` : 'http://localhost:4001');
const API_BASE = RAW_API_BASE.replace(/\/$/, '');

type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

type RefreshResponse = {
  access_token: string;
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  skipAuthRefresh?: boolean;
};

type JsonRequestConfig = AxiosRequestConfig & {
  body?: AxiosRequestConfig['data'];
};

function parseError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') {
    return fallback;
  }

  const record = payload as Record<string, unknown>;
  const error = record.error as Record<string, unknown> | undefined;

  return ((error?.message as string | undefined) ?? (record.message as string | undefined) ?? fallback).trim();
}

function currentAccessToken() {
  const state = useAuthStore.getState();
  return state.session?.accessToken ?? state.pendingSession?.accessToken ?? null;
}

function clearAuthState() {
  queryClient.clear();
  useAuthStore.getState().logout();
}

const publicAuthPaths = new Set(['/auth/login', '/auth/register', '/auth/face-login', '/auth/refresh', '/auth/logout']);

let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken() {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post<ApiEnvelope<RefreshResponse>>(
        '/auth/refresh',
        {},
        {
          skipAuthRefresh: true,
        } as RetryableRequestConfig,
      )
      .then((response) => {
        const nextToken = response.data.data.access_token;
        useAuthStore.getState().updateAccessToken(nextToken);
        return nextToken;
      })
      .catch((error: unknown) => {
        clearAuthState();
        throw error;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return refreshPromise;
}

function shouldRefreshRequest(config?: RetryableRequestConfig) {
  if (!config || config.skipAuthRefresh || config._retry) {
    return false;
  }

  const url = config.url ?? '';
  return !publicAuthPaths.has(url);
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
});

apiClient.interceptors.request.use((config) => {
  const token = currentAccessToken();
  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`);
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiEnvelope<unknown>>) => {
    const config = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (status !== 401 || !shouldRefreshRequest(config) || !currentAccessToken()) {
      throw new Error(parseError(error.response?.data, error.message || 'Request failed'));
    }

    try {
      const nextToken = await refreshAccessToken();
      if (!config) {
        throw error;
      }

      config._retry = true;
      config.headers.set('Authorization', `Bearer ${nextToken}`);
      return apiClient(config);
    } catch (refreshError) {
      throw refreshError instanceof Error ? refreshError : new Error('Session expired. Please sign in again.');
    }
  },
);

async function unwrapResponse<T>(promise: Promise<{ data: ApiEnvelope<T> }>): Promise<T> {
  try {
    const response = await promise;
    return response.data.data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }

    throw new Error('Request failed');
  }
}

export async function requestJson<T>(path: string, config: JsonRequestConfig = {}): Promise<T> {
  const { body, data, ...rest } = config;

  return unwrapResponse(
    apiClient.request<ApiEnvelope<T>>({
      url: path,
      data: data ?? body,
      ...rest,
    }),
  );
}

export async function requestForm<T>(path: string, formData: FormData, config: AxiosRequestConfig = {}): Promise<T> {
  return unwrapResponse(
    apiClient.request<ApiEnvelope<T>>({
      url: path,
      data: formData,
      ...config,
    }),
  );
}
