import { apiClient } from '../config/api';
import {
  PaymentStatus,
  PlannedPayment
} from '../types/plannedPayment';

export const getPlannedPaymentById = async (
  id: string
): Promise<PlannedPayment> => {
  const response = await apiClient.get<PlannedPayment>(
    `/api/planned-payments/${id}`
  );
  return response.data;
};

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


export const deletePlannedPayment = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/planned-payments/${id}`);
};
