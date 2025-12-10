import { FlashList } from '@shopify/flash-list';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import PlannedPaymentItem from '../components/PlannedPaymentItem';
import { usePlannedPaymentsByStatus } from '../hooks/usePlannedPayments';
import { PaymentStatus, PlannedPayment } from '../types/plannedPayment';

const OWNER = 'villamorvinzie';

export default function PlannedPayments() {
  const { data: plannedPayments, isLoading, isError, error, refetch } = usePlannedPaymentsByStatus(
    OWNER,
    PaymentStatus.ACTIVE
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading planned payments...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load planned payments. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!plannedPayments || plannedPayments.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No active planned payments</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PlannedPayment }) => {
    return <PlannedPaymentItem plannedPayment={item} />;
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={plannedPayments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6b7280',
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#ef4444',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#6b7280',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#ffffff',
  },
});
