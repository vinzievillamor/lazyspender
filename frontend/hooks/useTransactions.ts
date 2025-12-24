import { PageResponse } from '@/types/api';
import { QueryClient, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createTransaction, CreateTransactionRequest, deleteTransaction, getAllTransactions, getDistinctNotes, GetTransactionsParams, updateTransaction } from '../services/transaction.service';
import { Transaction } from '../types/transaction';
import { BALANCE_TREND_QUERY_KEYS } from './useBalanceTrend';

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
    onSuccess: (newTransaction) => {
      queryClient.setQueriesData<{ pages: PageResponse<Transaction>[], pageParams: number[] }>(
        { queryKey: TRANSACTION_QUERY_KEYS.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          const newPages = [...oldData.pages];
          if (newPages.length > 0) {
            newPages[0] = {
              ...newPages[0],
              content: [newTransaction, ...newPages[0].content],
              totalElements: newPages[0].totalElements + 1,
            };
          }

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
      invalidateBalanceTrend(queryClient);
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: CreateTransactionRequest }) => updateTransaction(id, request),
    onSuccess: (updatedTransaction) => {
      queryClient.setQueriesData<{ pages: PageResponse<Transaction>[], pageParams: number[] }>(
        { queryKey: TRANSACTION_QUERY_KEYS.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map(page => ({
            ...page,
            content: page.content.map(transaction =>
              transaction.id === updatedTransaction.id ? updatedTransaction : transaction
            ),
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );
      invalidateBalanceTrend(queryClient);
    },
  });
};

export const useDistinctNotes = (owner: string) => {
  return useQuery({
    queryKey: ["notes"],
    queryFn: () => getDistinctNotes(owner)
  })
}

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTransaction(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches to avoid overwriting our optimistic update
      await queryClient.cancelQueries({ queryKey: TRANSACTION_QUERY_KEYS.lists() });

      // Snapshot the previous value for rollback on error
      const previousData = queryClient.getQueriesData<{ pages: PageResponse<Transaction>[], pageParams: number[] }>({
        queryKey: TRANSACTION_QUERY_KEYS.lists()
      });

      // Optimistically remove the transaction from the UI immediately
      queryClient.setQueriesData<{ pages: PageResponse<Transaction>[], pageParams: number[] }>(
        { queryKey: TRANSACTION_QUERY_KEYS.lists() },
        (oldData) => {
          if (!oldData) return oldData;

          const newPages = oldData.pages.map(page => ({
            ...page,
            content: page.content.filter(transaction => transaction.id !== deletedId),
            totalElements: page.totalElements - 1,
          }));

          return {
            ...oldData,
            pages: newPages,
          };
        }
      );

      // Return context with the snapshot for potential rollback
      return { previousData };
    },
    onError: (_err, _deletedId, context) => {
      // If the mutation fails, roll back to the previous value
      if (context?.previousData) {
        context.previousData.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
    },
    onSettled: () => {
      // Refetch to ensure we're in sync with the server
      queryClient.invalidateQueries({ queryKey: TRANSACTION_QUERY_KEYS.lists() });
      invalidateBalanceTrend(queryClient);
    },
  });
};

const invalidateBalanceTrend = (queryClient: QueryClient) => {
  queryClient.invalidateQueries({ queryKey: BALANCE_TREND_QUERY_KEYS.all })
}