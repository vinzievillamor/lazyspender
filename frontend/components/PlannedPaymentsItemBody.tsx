import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
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
  const isIncome = amount > 0;

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>{getCategoryIcon(category)}</View>

      <View style={styles.categoryContainer}>
        <Text style={styles.categoryText}>{category}</Text>
        <Text style={styles.recurrenceText}>
          {recurrenceType} - {recurrenceValue}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text
          style={[styles.amountText, { color: isIncome ? '#10b981' : '#ef4444' }]}
        >
          {isIncome ? '+' : ''}{amount.toFixed(2)}
        </Text>
        <Text style={styles.dueDateText}>{formatNextDueDate(nextDueDate)}</Text>
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
    borderRadius: 20,
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  categoryText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1f2937',
    marginBottom: 2,
  },
  recurrenceText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6b7280',
  },
  amountContainer: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  amountText: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    marginBottom: 2,
  },
  dueDateText: {
    fontSize: 14,
    fontFamily: 'Roboto-Regular',
    color: '#6b7280',
  },
});

export default PlannedPaymentsItemBody;
