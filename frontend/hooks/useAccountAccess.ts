import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  acceptInvite,
  createInvite,
  getGrantedByMe,
  getGrantedToMe,
  getPending,
  leaveAccess,
  rejectInvite,
  revokeAccess
} from '../services/accountAccess.service';
import { CreateAccountAccessRequest } from '../types/accountAccess';

export const ACCOUNT_ACCESS_QUERY_KEYS = {
  all: ['account-access'] as const,
  pending: () => [...ACCOUNT_ACCESS_QUERY_KEYS.all, 'pending'] as const,
  grantedToMe: () => [...ACCOUNT_ACCESS_QUERY_KEYS.all, 'granted-to-me'] as const,
  grantedByMe: () => [...ACCOUNT_ACCESS_QUERY_KEYS.all, 'granted-by-me'] as const,
};

export const usePendingInvites = () => {
  return useQuery({
    queryKey: ACCOUNT_ACCESS_QUERY_KEYS.pending(),
    queryFn: getPending,
    refetchInterval: 60_000,
  });
};

export const useGrantedToMe = () => {
  return useQuery({
    queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedToMe(),
    queryFn: getGrantedToMe,
  });
};

export const useGrantedByMe = () => {
  return useQuery({
    queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedByMe(),
    queryFn: getGrantedByMe,
  });
};

export const useCreateInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAccountAccessRequest) => createInvite(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedByMe() });
    },
  });
};

export const useAcceptInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => acceptInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.pending() });
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedToMe() });
    },
  });
};

export const useRejectInvite = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => rejectInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.pending() });
    },
  });
};

export const useRevokeAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => revokeAccess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedByMe() });
    },
  });
};

export const useLeaveAccess = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => leaveAccess(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ACCOUNT_ACCESS_QUERY_KEYS.grantedToMe() });
    },
  });
};
