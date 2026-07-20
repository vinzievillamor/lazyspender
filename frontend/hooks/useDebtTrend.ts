import { useQuery } from '@tanstack/react-query';
import { getDebtTrend } from '../services/debtTrend.service';
import type { GetDebtTrendParams } from '../types/debtTrend';

export const DEBT_TREND_QUERY_KEYS = {
  all: ['debt-trend'] as const
};

interface UseDebtTrendOptions {
  enabled?: boolean;
}

export const useDebtTrend = (
  params: GetDebtTrendParams,
  options: UseDebtTrendOptions = {}
) => {
  return useQuery({
    queryKey: [...DEBT_TREND_QUERY_KEYS.all, params],
    queryFn: () => getDebtTrend(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: options.enabled,
  });
};
