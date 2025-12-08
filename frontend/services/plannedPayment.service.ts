import { apiClient } from '../config/api';
import {
  PlannedPaymentRequest,
  PlannedPaymentResponse,
  PaymentStatus,
} from '../types/plannedPayment';

export const createPlannedPayment = async (
  request: PlannedPaymentRequest
): Promise<PlannedPaymentResponse> => {
  const response = await apiClient.post<PlannedPaymentResponse>(
    '/api/planned-payments',
    request
  );
  return response.data;
};

export const getPlannedPaymentById = async (
  id: string
): Promise<PlannedPaymentResponse> => {
  const response = await apiClient.get<PlannedPaymentResponse>(
    `/api/planned-payments/${id}`
  );
  return response.data;
};

export const getAllPlannedPayments = async (
  owner: string
): Promise<PlannedPaymentResponse[]> => {
  const response = await apiClient.get<PlannedPaymentResponse[]>(
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
): Promise<PlannedPaymentResponse[]> => {
  const response = await apiClient.get<PlannedPaymentResponse[]>(
    '/api/planned-payments',
    {
      params: { owner, status },
    }
  );
  return response.data;
};

export const updatePlannedPayment = async (
  id: string,
  request: PlannedPaymentRequest
): Promise<PlannedPaymentResponse> => {
  const response = await apiClient.put<PlannedPaymentResponse>(
    `/api/planned-payments/${id}`,
    request
  );
  return response.data;
};

export const deletePlannedPayment = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/planned-payments/${id}`);
};
