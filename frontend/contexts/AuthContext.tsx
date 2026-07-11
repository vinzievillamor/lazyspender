import React, { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { setUnauthorizedHandler } from '../config/api';
import { clearStoredToken, getStoredToken, setStoredToken } from '../config/authStorage';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const signIn = useCallback(async (token: string) => {
    await setStoredToken(token);
    setIsAuthenticated(true);
  }, []);

  const signOut = useCallback(async () => {
    await clearStoredToken();
    setIsAuthenticated(false);
  }, []);

  // Let the axios layer force a sign-out on 401 without importing React context there
  useEffect(() => {
    setUnauthorizedHandler(() => setIsAuthenticated(false));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Resolve whether a session already exists on cold start
  useEffect(() => {
    getStoredToken()
      .then((token) => setIsAuthenticated(token !== null))
      .finally(() => setIsLoading(false));
  }, []);

  const value: AuthContextType = { isAuthenticated, isLoading, signIn, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuthContext = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
