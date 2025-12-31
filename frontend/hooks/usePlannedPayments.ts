import { QueryClient, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  confirmPlannedPayment,
  createPlannedPayment,
  deletePlannedPayment,
  getAllPlannedPayments,
  getPlannedPaymentById,
  getPlannedPaymentTransactions,
  updatePlannedPayment
} from '../services/plannedPayment.service';
import { CreatePlannedPaymentRequest, PlannedPayment } from '../types/plannedPayment';
import { TRANSACTION_QUERY_KEYS } from './useTransactions';
import { BALANCE_TREND_QUERY_KEYS } from './useBalanceTrend';

export const PLANNED_PAYMENT_QUERY_KEYS = {
  all: ['planned-payments'] as const,
  lists: () => [...PLANNED_PAYMENT_QUERY_KEYS.all, 'list'] as const,
  list: (owner: string) => [...PLANNED_PAYMENT_QUERY_KEYS.lists(), owner] as const,
  details: () => [...PLANNED_PAYMENT_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...PLANNED_PAYMENT_QUERY_KEYS.details(), id] as const,
  transactions: (id: string) => [...PLANNED_PAYMENT_QUERY_KEYS.detail(id), 'transactions'] as const,
};

export const usePlannedPayments = (owner: string) => {
  return useQuery({
    queryKey: PLANNED_PAYMENT_QUERY_KEYS.list(owner),
    queryFn: () => getAllPlannedPayments(owner),
    enabled: !!owner,
  });
};

export const usePlannedPayment = (id: string) => {
  return useQuery({
    queryKey: PLANNED_PAYMENT_QUERY_KEYS.detail(id),
    queryFn: () => getPlannedPaymentById(id),
    enabled: !!id,
  });
};

export const usePlannedPaymentTransactions = (id: string) => {
  return useQuery({
    queryKey: PLANNED_PAYMENT_QUERY_KEYS.transactions(id),
    queryFn: () => getPlannedPaymentTransactions(id),
    enabled: !!id,
  });
};

export const useCreatePlannedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreatePlannedPaymentRequest) => createPlannedPayment(request),
    onSuccess: (newPayment) => {
      queryClient.setQueriesData<PlannedPayment[]>(
        { queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() },
        (oldData) => oldData ? [newPayment, ...oldData] : [newPayment]
      );
    },
  });
};

export const useUpdatePlannedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CreatePlannedPaymentRequest }) =>
      updatePlannedPayment(id, request),
    onSuccess: (updatedPayment) => {
      queryClient.setQueriesData<PlannedPayment[]>(
        { queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() },
        (oldData) => oldData?.map(pp => pp.id === updatedPayment.id ? updatedPayment : pp)
      );
      queryClient.setQueryData(
        PLANNED_PAYMENT_QUERY_KEYS.detail(updatedPayment.id),
        updatedPayment
      );
    },
  });
};

export const useDeletePlannedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deletePlannedPayment(id),
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() });

      const previousData = queryClient.getQueriesData<PlannedPayment[]>({
        queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists()
      });

      queryClient.setQueriesData<PlannedPayment[]>(
        { queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() },
        (oldData) => oldData?.filter(pp => pp.id !== deletedId)
      );

      return { previousData };
    },
    onError: (_err, _deletedId, context) => {
      context?.previousData.forEach(([queryKey, data]) => {
        queryClient.setQueryData(queryKey, data);
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() });
    },
  });
};

export const useConfirmPlannedPayment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => confirmPlannedPayment(id),
    onSuccess: (_transaction, plannedPaymentId) => {
      // Invalidate planned payments to get updated nextDueDate and status
      queryClient.invalidateQueries({ queryKey: PLANNED_PAYMENT_QUERY_KEYS.lists() });
      queryClient.invalidateQueries({ queryKey: PLANNED_PAYMENT_QUERY_KEYS.detail(plannedPaymentId) });
      queryClient.invalidateQueries({ queryKey: PLANNED_PAYMENT_QUERY_KEYS.transactions(plannedPaymentId) });
      // Invalidate transactions since a new one was created
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.lists() });
      // Invalidate balance trend
      invalidateBalanceTrend(queryClient);
    },
  });
};

const invalidateBalanceTrend = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: BALANCE_TREND_QUERY_KEYS.all });
};
