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

// Request interceptor: attach the stored session JWT, if any
apiClient.interceptors.request.use(
  async (config) => {
    const token = await getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
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
