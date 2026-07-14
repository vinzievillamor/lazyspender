import { apiClient } from '../config/api';
import { AccountAccess, CreateAccountAccessRequest } from '../types/accountAccess';

export const createInvite = async (
  request: CreateAccountAccessRequest
): Promise<AccountAccess> => {
  const response = await apiClient.post<AccountAccess>('/api/account-access', request);
  return response.data;
};

export const getPending = async (): Promise<AccountAccess[]> => {
  const response = await apiClient.get<AccountAccess[]>('/api/account-access/pending');
  return response.data;
};

export const getGrantedToMe = async (): Promise<AccountAccess[]> => {
  const response = await apiClient.get<AccountAccess[]>('/api/account-access/granted-to-me');
  return response.data;
};

export const getGrantedByMe = async (): Promise<AccountAccess[]> => {
  const response = await apiClient.get<AccountAccess[]>('/api/account-access/granted-by-me');
  return response.data;
};

export const acceptInvite = async (id: string): Promise<void> => {
  await apiClient.post(`/api/account-access/${id}/accept`);
};

export const rejectInvite = async (id: string): Promise<void> => {
  await apiClient.post(`/api/account-access/${id}/reject`);
};

export const revokeAccess = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/account-access/${id}`);
};

export const leaveAccess = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/account-access/${id}/leave`);
};
