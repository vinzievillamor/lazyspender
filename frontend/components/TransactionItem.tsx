import { StyleSheet, View } from "react-native";
import { List, Surface, Text, useTheme } from "react-native-paper";
import { shadows, spacing } from "../config/theme";
import { Transaction, TransactionType } from "../types/transaction";
import { getCategoryIcon } from "../utils/categoryIcons";

interface TransactionItemProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
}

export default function TransactionItem({ transaction, onPress }: TransactionItemProps) {
  const theme = useTheme();
  const isIncome = transaction.type === TransactionType.INCOME;

  const handleOnPress = () => {
    onPress(transaction);
  }

  return (
    <Surface style={styles.surface} elevation={1}>
      <List.Item
        title={transaction.category}
        description={transaction.note}
        descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
        left={() => (
          <View style={styles.iconContainer}>
            {getCategoryIcon(transaction.category)}
          </View>
        )}
        right={() => (
          <Text
            variant="bodyMedium"
            style={[
              styles.amountText,
              { color: isIncome ? theme.colors.tertiary : theme.colors.error }
            ]}
          >
            {isIncome ? '+' : '-'}{transaction.amount.toFixed(2)}
          </Text>
        )}
        style={styles.listItem}
        onPress={handleOnPress}
        rippleColor="rgba(0, 0, 0, 0.1)"
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: 16,
    ...shadows.sm,
    overflow: 'hidden',
  },
  listItem: {
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  amountText: {
    alignSelf: "center",
    marginRight: spacing.lg
  },
});
