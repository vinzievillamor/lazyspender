import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { authenticateWithGoogle } from '../services/auth.service';

WebBrowser.maybeCompleteAuthSession();

export const useAuth = () => {
  const { isAuthenticated, isLoading, signIn, signOut } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    webClientId: Constants.expoConfig?.extra?.googleWebClientId,
    iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
    androidClientId: Constants.expoConfig?.extra?.googleAndroidClientId,
  });

  useEffect(() => {
    if (response?.type !== 'success') {
      if (response?.type === 'error') {
        setError(new Error(response.error?.message ?? 'Google sign-in failed'));
        setIsSigningIn(false);
      }
      return;
    }

    const idToken = response.params.id_token;
    setIsSigningIn(true);
    setError(null);

    authenticateWithGoogle(idToken)
      .then((auth) => signIn(auth.token))
      .catch((err) => setError(err instanceof Error ? err : new Error('Sign-in failed')))
      .finally(() => setIsSigningIn(false));
  }, [response, signIn]);

  return {
    isAuthenticated,
    isLoading,
    isSigningIn,
    error,
    canSignIn: !!request,
    promptGoogleSignIn: promptAsync,
    signOut,
  };
};
