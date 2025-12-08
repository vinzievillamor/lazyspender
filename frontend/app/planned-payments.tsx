import { FlashList } from '@shopify/flash-list';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import PlannedPaymentItem from '../components/PlannedPaymentItem';
import { getPlannedPaymentsByStatus } from '../services/plannedPayment.service';
import { PlannedPaymentResponse, PaymentStatus } from '../types/plannedPayment';

const OWNER = 'villamorvinzie';

export default function PlannedPayments() {
  const [plannedPayments, setPlannedPayments] = useState<PlannedPaymentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPlannedPayments();
  }, []);

  const fetchPlannedPayments = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getPlannedPaymentsByStatus(OWNER, PaymentStatus.ACTIVE);
      setPlannedPayments(response);
    } catch (err) {
      setError('Failed to load planned payments. Please try again.');
      console.error('Error fetching planned payments:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading planned payments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  if (plannedPayments.length === 0) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.emptyText}>No active planned payments</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: PlannedPaymentResponse }) => {
    return <PlannedPaymentItem plannedPayment={item} />;
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={plannedPayments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        estimatedItemSize={100}
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
});
