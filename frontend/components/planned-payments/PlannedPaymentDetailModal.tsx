import React from 'react';
import {
  FlatList,
  Modal,
  StyleSheet,
  View,
} from 'react-native';
import { ActivityIndicator, Button, Divider, IconButton, List, Surface, Text, useTheme } from 'react-native-paper';
import { shadows, spacing } from '../../config/theme';
import { usePlannedPaymentTransactions } from '../../hooks/usePlannedPayments';
import { EndType, PlannedPayment } from '../../types/plannedPayment';
import { Transaction, TransactionType } from '../../types/transaction';
import { getCategoryIcon } from '../../utils/categoryIcons';

interface PlannedPaymentDetailModalProps {
  visible: boolean;
  plannedPayment: PlannedPayment | null;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const PlannedPaymentDetailModal: React.FC<PlannedPaymentDetailModalProps> = ({
  visible,
  plannedPayment,
  onClose,
  onEdit,
  onDelete
}) => {
  const theme = useTheme();
  const { data: transactions, isLoading } = usePlannedPaymentTransactions(plannedPayment?.id || '');

  if (!plannedPayment) return null;

  const completedCount = transactions?.length || 0;
  const isExpense = true;
  const totalPaid = completedCount * Math.abs(plannedPayment.amount);

  const getProgressText = () => {
    if (plannedPayment.endType === EndType.NEVER) {
      return `${completedCount} completed`;
    }
    const total = parseInt(plannedPayment.endValue || '0', 10);
    return `${completedCount} of ${total} completed`;
  };

  const getRemainingBalance = () => {
    if (plannedPayment.endType === EndType.NEVER) {
      return 'Ongoing';
    }
    const total = parseInt(plannedPayment.endValue || '0', 10);
    const remaining = (total - completedCount) * Math.abs(plannedPayment.amount);
    return remaining.toFixed(2);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const renderTransactionItem = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === TransactionType.INCOME;
    return (
      <List.Item
        title={formatDate(item.date)}
        description={item.note || 'No note'}
        left={() => (
          <View style={styles.transactionIcon}>
            {getCategoryIcon(item.category, 20)}
          </View>
        )}
        right={() => (
          <Text
            variant="bodyMedium"
            style={{ color: isIncome ? theme.colors.tertiary : theme.colors.error }}
          >
            {isIncome ? '+' : '-'}{Math.abs(item.amount).toFixed(2)}
          </Text>
        )}
        style={styles.transactionItem}
      />
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <Surface style={styles.modalContent}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconContainer}>
                {getCategoryIcon(plannedPayment.category, 28)}
              </View>
              <View style={styles.headerText}>
                <Text variant="titleLarge">{plannedPayment.category}</Text>
                {plannedPayment.note && (
                  <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                    {plannedPayment.note}
                  </Text>
                )}
              </View>
            </View>
            <IconButton icon="close" onPress={onClose} />
          </View>

          <Divider />

          <View style={styles.summarySection}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Progress</Text>
                <Text variant="titleMedium">{getProgressText()}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Amount</Text>
                <Text
                  variant="titleMedium"
                  style={{ color: isExpense ? theme.colors.error : theme.colors.tertiary }}
                >
                  {isExpense ? '-' : '+'}{Math.abs(plannedPayment.amount).toFixed(2)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Total Paid</Text>
                <Text variant="titleMedium">{totalPaid.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Remaining</Text>
                <Text variant="titleMedium">{getRemainingBalance()}</Text>
              </View>
            </View>

            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Next Due</Text>
                <Text variant="titleMedium">{formatDate(plannedPayment.nextDueDate)}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant }}>Status</Text>
                <Text variant="titleMedium">{plannedPayment.status}</Text>
              </View>
            </View>
          </View>

          <Divider />

          <View style={styles.transactionsSection}>
            <Text variant="titleMedium" style={styles.transactionsTitle}>
              Transaction History
            </Text>
            {isLoading ? (
              <ActivityIndicator style={styles.loader} />
            ) : transactions && transactions.length > 0 ? (
              <FlatList
                data={transactions}
                renderItem={renderTransactionItem}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
              />
            ) : (
              <Text variant="bodyMedium" style={styles.emptyText}>
                No transactions yet
              </Text>
            )}
          </View>

          {(onDelete || onEdit) && (
            <View style={styles.footer}>
              {onDelete && (
                <Button
                  mode="outlined"
                  onPress={onDelete}
                  style={[styles.button, styles.deleteButton]}
                  textColor={theme.colors.error}
                  theme={{
                    colors: {
                      outline: theme.colors.error,
                    }
                  }}
                >
                  Delete
                </Button>
              )}
              {onEdit && (
                <Button
                  mode="contained"
                  onPress={onEdit}
                  style={styles.button}
                >
                  Edit
                </Button>
              )}
            </View>
          )}
        </Surface>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '85%',
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  summarySection: {
    padding: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  summaryItem: {
    flex: 1,
  },
  transactionsSection: {
    flex: 1,
    padding: spacing.xl,
    paddingTop: spacing.md,
  },
  transactionsTitle: {
    marginBottom: spacing.md,
  },
  transactionItem: {
    paddingLeft: 0,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    marginTop: spacing.xl,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: spacing.xl,
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: 12,
  },
  deleteButton: {
    borderWidth: 1,
  },
});

export default PlannedPaymentDetailModal;
