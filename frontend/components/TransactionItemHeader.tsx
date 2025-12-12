import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

interface TransactionItemHeaderProps {
  title: string;
}

export default function TransactionItemHeader({ title }: TransactionItemHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.TransactionItemHeader, { backgroundColor: theme.colors.elevation.level1 }]}>
      <Text variant="labelLarge" style={[styles.TransactionItemHeaderText, { color: theme.colors.primary }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  TransactionItemHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  TransactionItemHeaderText: {
    fontWeight: '600',
  },
});
