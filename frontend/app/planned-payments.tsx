import { FlatList, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Button, Text, useTheme } from 'react-native-paper';
import PlannedPaymentItem from '../components/PlannedPaymentItem';
import { usePlannedPaymentsByStatus } from '../hooks/usePlannedPayments';
import { PaymentStatus, PlannedPayment } from '../types/plannedPayment';

const OWNER = 'villamorvinzie';

export default function PlannedPayments() {
  const theme = useTheme();
  const { data: plannedPayments, isLoading, isError, error, refetch } = usePlannedPaymentsByStatus(
    OWNER,
    PaymentStatus.ACTIVE
  );

  if (isLoading) {
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>Loading planned payments...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load planned payments. Please try again.'}
        </Text>
        <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
          Retry
        </Button>
      </View>
    );
  }

  if (!plannedPayments || plannedPayments.length === 0) {
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={styles.emptyText}>No active planned payments</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PlannedPayment }) => {
    return <PlannedPaymentItem plannedPayment={item} />;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={plannedPayments}
        renderItem={renderItem}
        keyExtractor={(item: PlannedPayment) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
  errorText: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
  },
});
