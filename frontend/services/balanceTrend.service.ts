import { apiClient } from '../config/api';
import type { BalanceTrendResponse, GetBalanceTrendParams } from '../types/balanceTrend';

export const getBalanceTrend = async (
  params: GetBalanceTrendParams
): Promise<BalanceTrendResponse> => {
  const response = await apiClient.get<BalanceTrendResponse>('/api/balance-trend', {
    params: {
      owner: params.owner,
      accounts: params.accounts,
      period: params.period,
    },
  });
  return response.data;
};
