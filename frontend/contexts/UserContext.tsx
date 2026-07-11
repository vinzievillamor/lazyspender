import React, { createContext, ReactNode, useContext } from 'react';
import { useCurrentUser } from '../hooks/useUsers';
import { User } from '../types/user';

interface UserContextType {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const { data: user, isLoading, isError, error, refetch } = useCurrentUser();

  const value: UserContextType = {
    user,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
