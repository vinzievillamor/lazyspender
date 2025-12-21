import { useQuery } from '@tanstack/react-query';
import { getBalanceTrend } from '../services/balanceTrend.service';
import type { GetBalanceTrendParams } from '../types/balanceTrend';

export const BALANCE_TREND_QUERY_KEYS = {
  all: ['balance-trend'] as const
};

interface UseBalanceTrendOptions {
  enabled?: boolean;
}

export const useBalanceTrend = (
  params: GetBalanceTrendParams,
  options: UseBalanceTrendOptions = {}
) => {
  return useQuery({
    queryKey: [...BALANCE_TREND_QUERY_KEYS.all, params],
    queryFn: () => getBalanceTrend(params),
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: options.enabled,
  });
};
