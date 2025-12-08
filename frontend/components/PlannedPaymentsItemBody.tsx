import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { RecurrenceType } from '../types/plannedPayment';

interface PlannedPaymentsItemBodyProps {
  category: string;
  recurrenceType: RecurrenceType;
  recurrenceValue: string;
  amount: number;
  nextDueDate: string;
}

const getCategoryIcon = (category: string) => {
  const cat = category.toLowerCase();

  if (cat.includes('transportation') || cat.includes('car')) {
    return <MaterialIcons name="directions-car" size={24} color="#6366f1" />;
  } else if (cat.includes('groceries')) {
    return <MaterialIcons name="shopping-cart" size={24} color="#10b981" />;
  } else if (cat.includes('restaurant') || cat.includes('fast-food')) {
    return <MaterialIcons name="restaurant" size={24} color="#f59e0b" />;
  } else if (cat.includes('parking')) {
    return <MaterialIcons name="local-parking" size={24} color="#8b5cf6" />;
  } else if (cat.includes('sports') || cat.includes('active')) {
    return <MaterialIcons name="sports-soccer" size={24} color="#ef4444" />;
  } else if (cat.includes('software') || cat.includes('apps') || cat.includes('games')) {
    return <MaterialIcons name="computer" size={24} color="#3b82f6" />;
  } else if (cat.includes('holiday') || cat.includes('trips') || cat.includes('hotels')) {
    return <FontAwesome5 name="plane" size={20} color="#ec4899" />;
  } else if (cat.includes('bar') || cat.includes('cafe')) {
    return <Ionicons name="cafe" size={24} color="#8b4513" />;
  } else if (cat.includes('income')) {
    return <MaterialIcons name="attach-money" size={24} color="#10b981" />;
  } else {
    return <MaterialIcons name="payment" size={24} color="#6b7280" />;
  }
};

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
