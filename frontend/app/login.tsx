import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import { useAuth } from '../hooks/useAuth';
import { spacing } from '../config/theme';

export default function LoginScreen() {
  const theme = useTheme();
  const { isSigningIn, error, canSignIn, promptGoogleSignIn } = useAuth();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text variant="headlineMedium" style={[styles.title, { color: theme.colors.primary }]}>
        LazySpender
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        Sign in to track your income and expenses.
      </Text>

      <Button
        mode="contained"
        icon="google"
        onPress={() => promptGoogleSignIn()}
        loading={isSigningIn}
        disabled={!canSignIn || isSigningIn}
        style={styles.button}
      >
        Sign in with Google
      </Button>

      {isSigningIn && <ActivityIndicator style={styles.spinner} />}

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
    width: '100%',
  },
  spinner: {
    marginTop: spacing.lg,
  },
  error: {
    marginTop: spacing.lg,
    textAlign: 'center',
  },
});
