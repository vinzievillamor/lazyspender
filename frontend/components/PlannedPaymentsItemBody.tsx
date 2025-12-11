import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { RecurrenceType } from '../types/plannedPayment';
import { getCategoryIcon } from '../utils/categoryIcons';

interface PlannedPaymentsItemBodyProps {
  category: string;
  recurrenceType: RecurrenceType;
  recurrenceValue: string;
  amount: number;
  nextDueDate: string;
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

const PlannedPaymentsItemBody: React.FC<PlannedPaymentsItemBodyProps> = ({
  category,
  recurrenceType,
  recurrenceValue,
  amount,
  nextDueDate,
}) => {
  const theme = useTheme();
  const isIncome = amount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{getCategoryIcon(category)}</View>

      <View style={styles.categoryContainer}>
        <Text variant="bodyLarge">{category}</Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {recurrenceType} - {recurrenceValue}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text
          variant="bodyLarge"
          style={{ color: isIncome ? theme.colors.tertiary : theme.colors.onSurface }}
        >
          {isIncome ? '+' : ''}{amount.toFixed(2)}
        </Text>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          {formatNextDueDate(nextDueDate)}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 12,
  },
});

export default PlannedPaymentsItemBody;
