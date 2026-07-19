import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth.web';
import { spacing } from '../config/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { isReady, isSigningIn, error, renderButton } = useAuth();
  const buttonContainerRef = useRef<View>(null);

  useEffect(() => {
    if (isReady) {
      renderButton(buttonContainerRef.current);
    }
  }, [isReady, renderButton]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
        LazySpender
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Sign in to track your income and expenses.
      </Text>

      <View ref={buttonContainerRef} style={styles.button} />
      {(isSigningIn || !isReady) && <ActivityIndicator style={styles.spinner} />}

      {error && (
        <Text variant="bodySmall" style={[styles.error, { color: theme.colors.error }]}>
          {error.message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontWeight: '700',
    letterSpacing: 0.9,
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.xxxl,
  },
  button: {
    minHeight: 40,
  },
  spinner: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
