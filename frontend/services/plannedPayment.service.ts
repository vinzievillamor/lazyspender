import { apiClient } from '../config/api';
import { Transaction } from '../types/transaction';
import {
  CreatePlannedPaymentRequest,
  PaymentStatus,
  PlannedPayment
} from '../types/plannedPayment';

export const getAllPlannedPayments = async (
  owner: string
): Promise<PlannedPayment[]> => {
  const response = await apiClient.get<PlannedPayment[]>(
    '/api/planned-payments',
    {
      params: { owner },
    }
  );
  return response.data;
};

export const getPlannedPaymentsByStatus = async (
  owner: string,
  status: PaymentStatus
): Promise<PlannedPayment[]> => {
  const response = await apiClient.get<PlannedPayment[]>(
    '/api/planned-payments',
    {
      params: { owner, status },
    }
  );
  return response.data;
};

export const getPlannedPaymentById = async (
  id: string
): Promise<PlannedPayment> => {
  const response = await apiClient.get<PlannedPayment>(
    `/api/planned-payments/${id}`
  );
  return response.data;
};

export const createPlannedPayment = async (
  request: CreatePlannedPaymentRequest
): Promise<PlannedPayment> => {
  const response = await apiClient.post<PlannedPayment>(
    '/api/planned-payments',
    request
  );
  return response.data;
};

export const updatePlannedPayment = async (
  id: string,
  request: CreatePlannedPaymentRequest
): Promise<PlannedPayment> => {
  const response = await apiClient.put<PlannedPayment>(
    `/api/planned-payments/${id}`,
    request
  );
  return response.data;
};

export const deletePlannedPayment = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/planned-payments/${id}`);
};

export const confirmPlannedPayment = async (id: string): Promise<Transaction> => {
  const response = await apiClient.post<Transaction>(
    `/api/planned-payments/${id}/confirm`
  );
  return response.data;
};

export const getPlannedPaymentTransactions = async (
  id: string
): Promise<Transaction[]> => {
  const response = await apiClient.get<Transaction[]>(
    `/api/planned-payments/${id}/transactions`
  );
  return response.data;
};
