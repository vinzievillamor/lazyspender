import { apiClient } from '../config/api';
import type {
  ContributorsResponse,
  ExpenseDistributionResponse,
  GetContributorsParams,
  GetExpenseDistributionParams,
} from '../types/expenseDistribution';

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

export const getTopContributors = async (
  params: GetContributorsParams
): Promise<ContributorsResponse> => {
  const response = await apiClient.get<ContributorsResponse>('/api/expense-distribution/contributors', {
    params: {
      owner: params.owner,
      category: params.category,
      period: params.period,
    },
  });
  return response.data;
};
