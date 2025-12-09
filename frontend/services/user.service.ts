import { apiClient } from '../config/api';
import { User } from '../types/user';

/**
 * Get user by ID
 */
export const getUserById = async (id: string): Promise<User> => {
  const response = await apiClient.get<User>(`/api/users/${id}`);
  return response.data;
};

/**
 * Get user by owner
 */
export const getUserByOwner = async (owner: string): Promise<User> => {
  const response = await apiClient.get<User>(`/api/users/owner/${owner}`);
  return response.data;
};

/**
 * Get all users
 */
export const getAllUsers = async (): Promise<User[]> => {
  const response = await apiClient.get<User[]>('/api/users');
  return response.data;
};

/**
 * Create a new user
 */
export const createUser = async (userData: Omit<User, 'id'>): Promise<User> => {
  const response = await apiClient.post<User>('/api/users', userData);
  return response.data;
};

/**
 * Update an existing user
 */
export const updateUser = async (id: string, userData: Omit<User, 'id'>): Promise<User> => {
  const response = await apiClient.put<User>(`/api/users/${id}`, userData);
  return response.data;
};

/**
 * Delete a user
 */
export const deleteUser = async (id: string): Promise<void> => {
  await apiClient.delete(`/api/users/${id}`);
};
