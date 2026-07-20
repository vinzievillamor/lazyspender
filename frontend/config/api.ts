import axios from 'axios';
import Constants from 'expo-constants';
import { clearStoredToken, getStoredToken } from './authStorage';

// API base URL - configured via app.config.js and .env file
const API_BASE_URL = Constants.expoConfig?.extra?.apiBaseUrl || 'https://lazyspender-api-272563214847.us-east1.run.app';

// Create axios instance with default config
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds
});

// Set by AuthContext so a 401 here can clear the in-memory auth state too,
// not just the persisted token - this module has no access to React context.
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

// Set by AccessContext (same reasoning as onUnauthorized - interceptors can't
// reach React context directly), read on every request and used to detect a
// 403 caused by a grant being revoked mid-session.
let delegatedOwner: string | null = null;

export const setDelegatedOwnerHeader = (owner: string | null) => {
  delegatedOwner = owner;
};

let onAccessRevoked: (() => void) | null = null;

export const setAccessRevokedHandler = (handler: (() => void) | null) => {
  onAccessRevoked = handler;
};

// Request interceptor: attach the stored session JWT and delegated-owner header, if any
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (delegatedOwner) {
      config.headers['X-Delegated-Owner'] = delegatedOwner;
    }
    // Every response here is scoped by the Authorization/X-Delegated-Owner
    // headers, not by the URL - most endpoints happen to also encode owner
    // into their query params, but some (e.g. /api/debt-trend) don't, which
    // makes them cacheable by URL alone. Since headers aren't part of the
    // cache key without a matching Vary response header, a browser (or the
    // PWA's passthrough service worker) can serve one account's cached GET
    // response back to a different signed-in/delegated account after a
    // profile switch. Forcing no-store on every request closes that off
    // app-wide rather than per-endpoint.
    config.headers['Cache-Control'] = 'no-store';
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors globally
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    if (error.response) {
      // Server responded with error status
      console.error('API Error:', error.response.status, error.response.data);
      if (error.response.status === 401) {
        await clearStoredToken();
        onUnauthorized?.();
      }
      if (error.response.status === 403 && delegatedOwner) {
        onAccessRevoked?.();
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('Network Error:', error.message);
    } else {
      // Something else happened
      console.error('Error:', error.message);
    }
    return Promise.reject(error);
  }
);
