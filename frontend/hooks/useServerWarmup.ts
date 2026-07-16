import { useEffect, useState } from 'react';
import { pingHealth } from '../services/health.service';

const INITIAL_DELAY_MS = 500;
const MAX_DELAY_MS = 2000;
const BACKOFF_FACTOR = 1.3;
const SLOW_THRESHOLD_MS = 8000;

interface ServerWarmupState {
  isReady: boolean;
  isSlow: boolean;
}

/**
 * Polls the backend health endpoint until it responds, so the rest of the
 * app can wait out a Cloud Run cold start instead of firing requests at a
 * server that isn't up yet.
 */
export const useServerWarmup = (): ServerWarmupState => {
  const [isReady, setIsReady] = useState(false);
  const [isSlow, setIsSlow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout>;

    const slowTimer = setTimeout(() => {
      if (!cancelled) setIsSlow(true);
    }, SLOW_THRESHOLD_MS);

    const attempt = async (delayMs: number) => {
      const healthy = await pingHealth();
      if (cancelled) return;
      if (healthy) {
        setIsReady(true);
        return;
      }
      retryTimer = setTimeout(() => attempt(Math.min(delayMs * BACKOFF_FACTOR, MAX_DELAY_MS)), delayMs);
    };

    attempt(INITIAL_DELAY_MS);

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
      clearTimeout(retryTimer);
    };
  }, []);

  return { isReady, isSlow };
};
