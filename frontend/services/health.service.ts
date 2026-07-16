import { apiClient } from '../config/api';

interface HealthResponse {
  status: string;
}

/**
 * Pings the backend's actuator health endpoint. Used to detect when a Cloud
 * Run instance that scaled to zero has finished cold-starting, and returns
 * false (not just for a cold start, but also a 503, or a 200 with a non-UP
 * body) if any health indicator - e.g. the Datastore connection - isn't UP.
 * Checked against the body rather than just the HTTP status because
 * actuator's default status-to-HTTP-code mapping treats UNKNOWN the same as
 * UP (200).
 */
export const pingHealth = async (): Promise<boolean> => {
  try {
    const response = await apiClient.get<HealthResponse>('/actuator/health', { timeout: 3000 });
    return response.data.status === 'UP';
  } catch {
    return false;
  }
};
