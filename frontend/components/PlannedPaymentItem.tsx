import React from 'react';
import { StyleSheet, View } from 'react-native';
import { List, Text, useTheme } from 'react-native-paper';
import { PlannedPayment } from '../types/plannedPayment';
import { getCategoryIcon } from '../utils/categoryIcons';

interface PlannedPaymentItemProps {
  plannedPayment: PlannedPayment;
}

const formatNextDueDate = (dateString: string): string => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  today.setHours(0, 0, 0, 0);
  tomorrow.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  } else if (date.getTime() === tomorrow.getTime()) {
    return 'Tomorrow';
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
};

const PlannedPaymentItem: React.FC<PlannedPaymentItemProps> = ({
  plannedPayment,
}) => {
  const theme = useTheme();
  const isIncome = plannedPayment.amount > 0;

  return (
    <List.Item
      title={plannedPayment.description}
      description={() => (
        <View style={styles.descriptionContainer}>
          <Text variant="bodyMedium" style={styles.categoryText}>
            {plannedPayment.category}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {plannedPayment.recurrenceType} - {plannedPayment.recurrenceValue}
          </Text>
        </View>
      )}
      left={() => (
        <View style={styles.iconContainer}>
          {getCategoryIcon(plannedPayment.category)}
        </View>
      )}
      right={() => (
        <View style={styles.amountContainer}>
          <Text
            variant="bodyLarge"
            style={[
              styles.amountText,
              { color: isIncome ? theme.colors.tertiary : theme.colors.onSurface }
            ]}
          >
            {isIncome ? '+' : ''}{plannedPayment.amount.toFixed(2)}
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatNextDueDate(plannedPayment.nextDueDate)}
          </Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 16,
    marginRight: 8,
  },
  descriptionContainer: {
    marginTop: 4,
  },
  categoryText: {
    marginBottom: 2,
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: 16,
  },
  amountText: {
    marginBottom: 2,
  },
});

export default PlannedPaymentItem;
