import { apiClient } from '../config/api';
import { PageResponse } from '../types/api';
import { Transaction, TransactionType } from '../types/transaction';

export interface GetTransactionsParams {
  page?: number;
  size?: number;
}

export interface CreateTransactionRequest {
  owner: string;
  account: string;
  category: string;
  amount: number;
  note?: string;
  date: string;
  currency: string;
  refCurrencyAmount: number;
  plannedPaymentId?: string;
  type: TransactionType;
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

/**
 * Create a new transaction
 */
export const createTransaction = async (request: CreateTransactionRequest): Promise<Transaction> => {
  const response = await apiClient.post<Transaction>('/api/transactions', request);
  return response.data;
};
