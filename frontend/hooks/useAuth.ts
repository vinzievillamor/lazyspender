import { GoogleSignin, isErrorWithCode, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { useState } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { authenticateWithGoogle } from '../services/auth.service';

GoogleSignin.configure({
  webClientId: Constants.expoConfig?.extra?.googleWebClientId,
  iosClientId: Constants.expoConfig?.extra?.googleIosClientId,
});

export const useAuth = () => {
  const { isAuthenticated, isLoading, signIn, signOut: signOutSession } = useAuthContext();
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const promptGoogleSignIn = async () => {
    setIsSigningIn(true);
    setError(null);

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response) || !response.data.idToken) {
        return;
      }

      const auth = await authenticateWithGoogle(response.data.idToken);
      await signIn(auth.token);
    } catch (err) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }
      setError(err instanceof Error ? err : new Error('Sign-in failed'));
    } finally {
      setIsSigningIn(false);
    }
  };

  const signOut = async () => {
    await GoogleSignin.signOut();
    await signOutSession();
  };

  return {
    isAuthenticated,
    isLoading,
    isSigningIn,
    error,
    canSignIn: true,
    promptGoogleSignIn,
    signOut,
  };
};
