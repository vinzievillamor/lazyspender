import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { spacing } from "../config/theme";

interface TransactionItemHeaderProps {
  title: string;
}

export default function TransactionItemHeader({ title }: TransactionItemHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.TransactionItemHeader, { backgroundColor: theme.colors.background }]}>
      <Text variant="labelLarge" style={[styles.TransactionItemHeaderText, { color: theme.colors.primary }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  TransactionItemHeader: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  TransactionItemHeaderText: {
    letterSpacing: 0.5,
  },
});
