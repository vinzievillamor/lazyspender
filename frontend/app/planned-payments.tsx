import { useIsFocused } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, FAB, Text, useTheme } from "react-native-paper";
import PlannedPaymentDetailModal from "../components/planned-payments/PlannedPaymentDetailModal";
import PlannedPaymentFormModal from "../components/planned-payments/PlannedPaymentFormModal";
import PlannedPaymentItem from "../components/planned-payments/PlannedPaymentItem";
import { spacing } from "../config/theme";
import { useUser } from "../contexts/UserContext";
import {
  useConfirmPlannedPayment,
  useDeletePlannedPayment,
  usePlannedPayments,
  usePlannedPaymentTransactions
} from "../hooks/usePlannedPayments";
import { PlannedPayment } from "../types/plannedPayment";

export default function PlannedPayments() {
  const theme = useTheme();
  const { user } = useUser();
  const isFocused = useIsFocused();

  const [isFormModalVisible, setFormModalVisible] = useState(false);
  const [isDetailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PlannedPayment | null>(null);

  const {
    data: plannedPayments,
    isLoading,
    isError,
    error,
    refetch,
  } = usePlannedPayments(user?.owner || '');

  const deleteMutation = useDeletePlannedPayment();
  const confirmMutation = useConfirmPlannedPayment();

  // Get transaction counts for each planned payment
  const transactionCounts = useMemo(() => {
    const counts: { [key: string]: number } = {};
    plannedPayments?.forEach(pp => {
      counts[pp.id] = 0; // Will be populated by individual queries
    });
    return counts;
  }, [plannedPayments]);

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

  const handlePressPayment = (payment: PlannedPayment) => {
    setSelectedPayment(payment);
    setDetailModalVisible(true);
  };

  const handleConfirmPayment = async (paymentId: string) => {
    await confirmMutation.mutateAsync(paymentId);
  };

  const handleDeletePayment = (paymentId: string) => {
    deleteMutation.mutate(paymentId);
  };

  const handleEditFromDetail = () => {
    setDetailModalVisible(false);
    setFormModalVisible(true);
  };

  const handleDeleteFromDetail = () => {
    if (selectedPayment) {
      deleteMutation.mutate(selectedPayment.id);
      setDetailModalVisible(false);
      setSelectedPayment(null);
    }
  };

  const handleFormClose = () => {
    setFormModalVisible(false);
    setSelectedPayment(null);
  };

  const handleDetailClose = () => {
    setDetailModalVisible(false);
    setSelectedPayment(null);
  };

  const renderItem = ({ item }: { item: PlannedPayment }) => {
    return (
      <PlannedPaymentItemWithCount
        plannedPayment={item}
        onPress={handlePressPayment}
        onConfirm={handleConfirmPayment}
        onDelete={handleDeletePayment}
      />
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text variant="bodyLarge" style={styles.emptyText}>
        No planned payments yet
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtext}>
        Tap the + button to create one
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={plannedPayments}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={plannedPayments?.length === 0 ? styles.emptyList : undefined}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          setSelectedPayment(null);
          setFormModalVisible(true);
        }}
      />

      <PlannedPaymentFormModal
        key={selectedPayment?.id || 'new'}
        visible={isFormModalVisible}
        onClose={handleFormClose}
        initialData={selectedPayment || undefined}
      />

      <PlannedPaymentDetailModal
        visible={isDetailModalVisible}
        plannedPayment={selectedPayment}
        onClose={handleDetailClose}
        onEdit={handleEditFromDetail}
        onDelete={handleDeleteFromDetail}
      />
    </View>
  );
}

// Wrapper component to fetch transaction count for each item
function PlannedPaymentItemWithCount({
  plannedPayment,
  onPress,
  onConfirm,
  onDelete
}: {
  plannedPayment: PlannedPayment;
  onPress: (payment: PlannedPayment) => void;
  onConfirm: (paymentId: string) => Promise<void>;
  onDelete: (paymentId: string) => void;
}) {
  const { data: transactions } = usePlannedPaymentTransactions(plannedPayment.id);
  const completedCount = transactions?.length || 0;

  return (
    <PlannedPaymentItem
      plannedPayment={plannedPayment}
      onPress={onPress}
      onConfirm={onConfirm}
      onDelete={onDelete}
      completedCount={completedCount}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorText: {
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  retryButton: {
    marginTop: spacing.lg,
    borderRadius: 12,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    color: "#666",
  },
  emptySubtext: {
    color: "#999",
    marginTop: spacing.sm,
  },
  emptyList: {
    flex: 1,
  },
});
