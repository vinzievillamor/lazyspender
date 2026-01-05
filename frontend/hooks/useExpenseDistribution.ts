import { useQuery } from '@tanstack/react-query';
import { getExpenseDistribution, getTopContributors } from '../services/expenseDistribution.service';
import type { GetContributorsParams, GetExpenseDistributionParams } from '../types/expenseDistribution';

export const EXPENSE_DISTRIBUTION_QUERY_KEYS = {
  all: ['expense-distribution'] as const,
  contributors: ['expense-distribution-contributors'] as const,
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

interface UseTopContributorsOptions {
  enabled?: boolean;
}

export const useTopContributors = (
  params: GetContributorsParams,
  options: UseTopContributorsOptions = {}
) => {
  return useQuery({
    queryKey: [...EXPENSE_DISTRIBUTION_QUERY_KEYS.contributors, params],
    queryFn: () => getTopContributors(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: options.enabled,
  });
};
