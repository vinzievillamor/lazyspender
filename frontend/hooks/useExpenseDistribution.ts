import { useQuery } from '@tanstack/react-query';
import { getExpenseDistribution } from '../services/expenseDistribution.service';
import type { GetExpenseDistributionParams } from '../types/expenseDistribution';

export const EXPENSE_DISTRIBUTION_QUERY_KEYS = {
  all: ['expense-distribution'] as const
};

interface UseExpenseDistributionOptions {
  enabled?: boolean;
}

export const useExpenseDistribution = (
  params: GetExpenseDistributionParams,
  options: UseExpenseDistributionOptions = {}
) => {
  return useQuery({
    queryKey: [...EXPENSE_DISTRIBUTION_QUERY_KEYS.all, params],
    queryFn: () => getExpenseDistribution(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: options.enabled,
  });
};
