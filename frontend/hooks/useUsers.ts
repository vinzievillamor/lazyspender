import { useMutation, useQuery } from '@tanstack/react-query';
import { createUser, getUserByOwner } from '../services/user.service';
import { User } from '../types/user';

export const useUserByOwner = (owner: string) => useQuery({
  queryKey: [owner],
  queryFn: () => getUserByOwner(owner)
});

export const useCreateUser = () => useMutation({
  mutationFn: (userData: Omit<User, 'id'>) => createUser(userData)
});;
