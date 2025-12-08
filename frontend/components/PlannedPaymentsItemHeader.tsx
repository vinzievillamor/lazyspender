import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface PlannedPaymentsItemHeaderProps {
  description: string;
}

const PlannedPaymentsItemHeader: React.FC<PlannedPaymentsItemHeaderProps> = ({
  description,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.description}>{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    fontFamily: 'Roboto-Bold',
    color: '#1f2937',
  },
});

export default PlannedPaymentsItemHeader;
