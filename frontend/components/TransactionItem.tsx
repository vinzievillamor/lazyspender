import { View, StyleSheet } from "react-native";
import { List, Text, useTheme } from "react-native-paper";
import { Transaction, TransactionType } from "../types/transaction";
import { getCategoryIcon } from "../utils/categoryIcons";

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const theme = useTheme();
  const isIncome = transaction.type === TransactionType.INCOME;

  return (
    <List.Item
      title={transaction.category}
      description={transaction.note}
      left={() => (
        <View style={styles.iconContainer}>
          {getCategoryIcon(transaction.category)}
        </View>
      )}
      right={() => (
        <Text
          variant="bodyLarge"
          style={[
            styles.amountText,
            { color: isIncome ? theme.colors.tertiary : theme.colors.error }
          ]}
        >
          {isIncome ? '+' : '-'}{transaction.amount.toFixed(2)}
        </Text>
      )}
    />
  );
}

const styles = StyleSheet.create({
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 16,
    marginRight: 8,
  },
  amountText: {
    alignSelf: "center",
    marginRight: 16,
  },
});
