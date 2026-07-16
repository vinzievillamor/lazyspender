import { apiClient } from '../config/api';
import type { DebtTrendResponse, GetDebtTrendParams } from '../types/debtTrend';

export const getDebtTrend = async (
  params: GetDebtTrendParams
): Promise<DebtTrendResponse> => {
  const response = await apiClient.get<DebtTrendResponse>('/api/debt-trend', {
    params: {
      from: params.from,
      to: params.to,
      aggregate: params.aggregate,
    },
  });
  return response.data;
};
