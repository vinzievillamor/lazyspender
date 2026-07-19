import Constants from 'expo-constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { authenticateWithGoogle } from '../services/auth.service';

const GSI_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';

declare global {
  interface Window {
    google?: any;
  }
}

let gsiScriptPromise: Promise<void> | null = null;

// @react-native-google-signin/google-signin is native-only (it throws on import via
// TurboModuleRegistry.getEnforcing when there's no native module registered), so web
// uses Google Identity Services directly instead. See docs/google-sso-onboarding-design.md.
function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) {
    return Promise.resolve();
  }

  if (!gsiScriptPromise) {
    gsiScriptPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[src="${GSI_SCRIPT_SRC}"]`);
      if (existing) {
        existing.addEventListener('load', () => resolve());
        existing.addEventListener('error', () => reject(new Error('Failed to load Google Identity Services script')));
        return;
      }

      const script = document.createElement('script');
      script.src = GSI_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Google Identity Services script'));
      document.head.appendChild(script);
    });
  }

  return gsiScriptPromise;
}

export const useAuth = () => {
  const { isAuthenticated, isLoading, signIn, signOut: signOutSession } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const signInRef = useRef(signIn);
  signInRef.current = signIn;

  useEffect(() => {
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled) return;

        window.google!.accounts.id.initialize({
          client_id: Constants.expoConfig?.extra?.googleWebClientId,
          callback: async (response: { credential: string }) => {
            setIsSigningIn(true);
            setError(null);
            try {
              const auth = await authenticateWithGoogle(response.credential);
              await signInRef.current(auth.token);
            } catch (err) {
              setError(err instanceof Error ? err : new Error('Sign-in failed'));
            } finally {
              setIsSigningIn(false);
            }
          },
        });
        setIsReady(true);
      })
      .catch((err) => setError(err instanceof Error ? err : new Error('Sign-in failed')));

    return () => {
      cancelled = true;
    };
  }, []);

  const renderButton = useCallback((node: unknown) => {
    if (node && window.google?.accounts?.id) {
      window.google.accounts.id.renderButton(node, {
        type: 'standard',
        theme: 'filled_blue',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        logo_alignment: 'left',
      });
    }
  }, []);

  const signOut = async () => {
    window.google?.accounts?.id?.disableAutoSelect();
    await signOutSession();
  };

  return {
    isAuthenticated,
    isLoading,
    isSigningIn,
    error,
    isReady,
    renderButton,
    signOut,
  };
};
