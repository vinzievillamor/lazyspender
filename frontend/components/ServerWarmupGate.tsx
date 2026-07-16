import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text, useTheme } from 'react-native-paper';
import { spacing } from '../config/theme';
import { useServerWarmup } from '../hooks/useServerWarmup';

interface ServerWarmupGateProps {
  children: ReactNode;
}

/**
 * Blocks navigation until the backend responds. The Cloud Run service scales
 * to zero when idle, so the first open after a while needs to wait out a
 * cold start instead of letting screens fire requests at a server that
 * isn't up yet.
 */
export default function ServerWarmupGate({ children }: ServerWarmupGateProps) {
  const { isReady, isSlow } = useServerWarmup();
  const theme = useTheme();

  if (isReady) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ActivityIndicator size="large" />
      <Text variant="titleMedium" style={[styles.title, { color: theme.colors.onBackground }]}>
        Waking up the server…
      </Text>
      <Text variant="bodyMedium" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
        {isSlow
          ? "Almost there. We turn the server off when nobody's using the app to save money, so it takes a little longer to wake back up."
          : "We turn the server off when nobody's using the app to save money. It's booting back up now."}
      </Text>
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
    marginTop: spacing.lg,
    fontWeight: '600',
  },
  subtitle: {
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});
