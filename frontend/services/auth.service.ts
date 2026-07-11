import { apiClient } from '../config/api';

export interface AuthResponse {
  token: string;
  id: string;
  owner: string;
  email: string;
  name: string;
  pictureUrl: string;
}

/**
 * Exchange a Google ID token for an app session JWT
 */
export const authenticateWithGoogle = async (idToken: string): Promise<AuthResponse> => {
  const response = await apiClient.post<AuthResponse>('/api/auth/google', { idToken });
  return response.data;
};
