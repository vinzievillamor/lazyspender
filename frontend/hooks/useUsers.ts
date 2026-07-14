import { useMutation, useQuery } from '@tanstack/react-query';
import { createUser, getCurrentUser } from '../services/user.service';
import { User } from '../types/user';

export const CURRENT_USER_QUERY_KEY = ['users', 'me'] as const;

export const useCurrentUser = () => useQuery({
  queryKey: CURRENT_USER_QUERY_KEY,
  queryFn: () => getCurrentUser()
});

// Distinct from useCurrentUser: this reflects whichever profile is currently
// active (self or a delegated owner), keyed by that owner so switching
// profiles naturally triggers a refetch instead of silently keeping self's
// cached record. getCurrentUser() resolves server-side via the
// X-Delegated-Owner header (see config/api.ts), so passing the active owner
// through the query key is enough - no explicit invalidation needed.
export const ACTIVE_USER_QUERY_KEY = (owner: string) => ['users', 'active', owner] as const;

export const useActiveUser = (owner: string) => useQuery({
  queryKey: ACTIVE_USER_QUERY_KEY(owner),
  queryFn: () => getCurrentUser(),
  enabled: !!owner,
});

export const useCreateUser = () => useMutation({
  mutationFn: (userData: Omit<User, 'id'>) => createUser(userData)
});;
