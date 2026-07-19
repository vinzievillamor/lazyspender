import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const DISMISSED_KEY = 'lazyspender:installPromptDismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type InstallPromptState =
  | { kind: 'none' }
  | { kind: 'android'; promptEvent: BeforeInstallPromptEvent }
  | { kind: 'ios' };

/**
 * Chrome/Android exposes a native install prompt via `beforeinstallprompt`, which we
 * capture so a custom banner can trigger it on demand. iOS Safari has no equivalent
 * API — "Add to Home Screen" only exists behind the manual Share sheet — so there we
 * just detect eligibility and show instructions instead.
 */
export const useInstallPrompt = () => {
  const [state, setState] = useState<InstallPromptState>({ kind: 'none' });
  const [dismissed, setDismissed] = useState(
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.localStorage.getItem(DISMISSED_KEY) === 'true'
      : true,
  );

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (window.navigator.serviceWorker) {
      window.navigator.serviceWorker.register('/sw.js').catch(() => {
        // Installability degrades gracefully without a service worker; nothing to do here.
      });
    }

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    const userAgent = window.navigator.userAgent;
    const isIos = /iPad|iPhone|iPod/.test(userAgent);
    const isSafari = /Safari/.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(userAgent);
    if (isIos && isSafari) {
      setState({ kind: 'ios' });
      return;
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setState({ kind: 'android', promptEvent: event as BeforeInstallPromptEvent });
    };
    const handleAppInstalled = () => setState({ kind: 'none' });

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISSED_KEY, 'true');
    }
  };

  const promptInstall = async () => {
    if (state.kind !== 'android') return;
    await state.promptEvent.prompt();
    await state.promptEvent.userChoice;
    setState({ kind: 'none' });
  };

  return {
    visible: !dismissed && state.kind !== 'none',
    variant: state.kind === 'ios' ? 'ios' : 'android',
    promptInstall,
    dismiss,
  } as const;
};
