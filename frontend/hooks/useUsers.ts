import { useMutation, useQuery } from '@tanstack/react-query';
import { createUser, getCurrentUser } from '../services/user.service';
import { User } from '../types/user';

export const CURRENT_USER_QUERY_KEY = ['users', 'me'] as const;

export const useCurrentUser = () => useQuery({
  queryKey: CURRENT_USER_QUERY_KEY,
  queryFn: () => getCurrentUser()
});

export const useCreateUser = () => useMutation({
  mutationFn: (userData: Omit<User, 'id'>) => createUser(userData)
});;
