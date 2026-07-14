import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const DELEGATED_OWNER_KEY = 'delegated_owner';

// expo-secure-store has no web implementation (its native module is a no-op there),
// so fall back to localStorage on web.
export const getStoredDelegatedOwner = (): Promise<string | null> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.getItem(DELEGATED_OWNER_KEY))
    : SecureStore.getItemAsync(DELEGATED_OWNER_KEY);

export const setStoredDelegatedOwner = (owner: string): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.setItem(DELEGATED_OWNER_KEY, owner))
    : SecureStore.setItemAsync(DELEGATED_OWNER_KEY, owner);

export const clearStoredDelegatedOwner = (): Promise<void> =>
  Platform.OS === 'web'
    ? Promise.resolve(localStorage.removeItem(DELEGATED_OWNER_KEY))
    : SecureStore.deleteItemAsync(DELEGATED_OWNER_KEY);
