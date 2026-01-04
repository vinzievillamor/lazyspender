import { apiClient } from '../config/api';
import type { ExpenseDistributionResponse, GetExpenseDistributionParams } from '../types/expenseDistribution';

export const getExpenseDistribution = async (
  params: GetExpenseDistributionParams
): Promise<ExpenseDistributionResponse> => {
  const response = await apiClient.get<ExpenseDistributionResponse>('/api/expense-distribution', {
    params: {
      owner: params.owner,
      accounts: params.accounts,
      period: params.period,
    },
  });
  return response.data;
};
