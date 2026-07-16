import { apiClient } from '../config/api';

/**
 * Pings the backend's actuator health endpoint. Used to detect when a Cloud
 * Run instance that scaled to zero has finished cold-starting, and returns
 * false (not just for a cold start, but also a 503) if any health indicator
 * - e.g. the Datastore connection - reports DOWN.
 */
export const pingHealth = async (): Promise<boolean> => {
  try {
    await apiClient.get('/actuator/health', { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
};
