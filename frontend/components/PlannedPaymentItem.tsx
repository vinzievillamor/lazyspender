import React from 'react';
import { StyleSheet, View } from 'react-native';
import { PlannedPayment } from '../types/plannedPayment';
import PlannedPaymentsItemBody from './PlannedPaymentsItemBody';
import PlannedPaymentsItemHeader from './PlannedPaymentsItemHeader';

interface PlannedPaymentItemProps {
  plannedPayment: PlannedPayment;
}

const PlannedPaymentItem: React.FC<PlannedPaymentItemProps> = ({
  plannedPayment,
}) => {
  return (
    <View style={styles.container}>
      <PlannedPaymentsItemHeader description={plannedPayment.description} />
      <PlannedPaymentsItemBody
        category={plannedPayment.category}
        recurrenceType={plannedPayment.recurrenceType}
        recurrenceValue={plannedPayment.recurrenceValue}
        amount={plannedPayment.amount}
        nextDueDate={plannedPayment.nextDueDate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: '#ffffff',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
});

export default PlannedPaymentItem;
