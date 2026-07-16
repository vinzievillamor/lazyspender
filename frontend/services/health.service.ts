import { apiClient } from '../config/api';

/**
 * Pings the backend health endpoint. Used to detect when a Cloud Run
 * instance that scaled to zero has finished cold-starting.
 */
export const pingHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/api/health', { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
};
