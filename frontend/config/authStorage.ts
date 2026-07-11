import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const TOKEN_KEY = 'auth_token';

// expo-secure-store has no web implementation (its native module is a no-op there),
// so fall back to localStorage on web.
export const getStoredToken = (): Promise<string | null> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.getItem(TOKEN_KEY))
    : SecureStore.getItemAsync(TOKEN_KEY);

export const setStoredToken = (token: string): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.setItem(TOKEN_KEY, token))
    : SecureStore.setItemAsync(TOKEN_KEY, token);

export const clearStoredToken = (): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.removeItem(TOKEN_KEY))
    : SecureStore.deleteItemAsync(TOKEN_KEY);
