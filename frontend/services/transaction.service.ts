import { apiClient } from '../config/api';
import { Transaction } from '../types/transaction';
import { PageResponse } from '../types/api';

export interface GetTransactionsParams {
  page?: number;
  size?: number;
}

/**
 * Get all transactions with pagination
 */
export const getAllTransactions = async (params: GetTransactionsParams = {}): Promise<PageResponse<Transaction>> => {
  const { page = 0, size = 20 } = params;
  const response = await apiClient.get<PageResponse<Transaction>>('/api/transactions', {
    params: { page, size },
  });
  return response.data;
};
