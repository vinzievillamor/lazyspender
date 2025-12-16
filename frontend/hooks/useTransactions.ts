import { PageResponse } from '@/types/api';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createTransaction, CreateTransactionRequest, getAllTransactions, GetTransactionsParams, updateTransaction } from '../services/transaction.service';
import { Transaction } from '../types/transaction';

export const TRANSACTION_QUERY_KEYS = {
  all: ['transactions'] as const,
  lists: () => [...TRANSACTION_QUERY_KEYS.all, 'list'] as const,
  list: (params?: GetTransactionsParams) => [...TRANSACTION_QUERY_KEYS.lists(), params] as const,
};

interface UseTransactionsOptions {
  pageSize?: number;
  enabled?: boolean;
}

export const useTransactions = (options: UseTransactionsOptions = {}) => {
  const { pageSize, enabled = true } = options;

  return useInfiniteQuery({
    queryKey: TRANSACTION_QUERY_KEYS.list({ size: pageSize }),
    queryFn: ({ pageParam }) => getAllTransactions({ page: pageParam as number, size: pageSize }),
    initialPageParam: 0,
    getNextPageParam: (lastPage: PageResponse<Transaction>) => lastPage.hasNext ? lastPage.pageNumber + 1 : null,
    enabled
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateTransactionRequest) => createTransaction(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.lists() });
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CreateTransactionRequest }) => updateTransaction(id, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.lists() });
    },
  });
};