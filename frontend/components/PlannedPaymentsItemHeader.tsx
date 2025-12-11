import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';

interface PlannedPaymentsItemHeaderProps {
  description: string;
}

const PlannedPaymentsItemHeader: React.FC<PlannedPaymentsItemHeaderProps> = ({
  description,
}) => {
  return (
    <View style={styles.container}>
      <Text variant="bodyLarge">{description}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
});

export default PlannedPaymentsItemHeader;
