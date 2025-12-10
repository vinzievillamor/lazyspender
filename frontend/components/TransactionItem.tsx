import { View, Text, StyleSheet } from "react-native";
import { Transaction, TransactionType } from "../types/transaction";
import { getCategoryIcon } from "../utils/categoryIcons";

interface TransactionItemProps {
  transaction: Transaction;
}

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.type === TransactionType.INCOME;

  return (
    <View style={styles.transactionItem}>
      <View style={styles.iconContainer}>
        {getCategoryIcon(transaction.category)}
      </View>

      <View style={styles.detailsContainer}>
        <Text style={styles.categoryText}>{transaction.category}</Text>
        {transaction.note ? (
          <Text style={styles.noteText}>{transaction.note}</Text>
        ) : null}
      </View>

      <View style={styles.amountContainer}>
        <Text style={[
          styles.amountText,
          { color: isIncome ? '#10b981' : '#ef4444' }
        ]}>
          {isIncome ? '+' : '-'}{transaction.amount.toFixed(2)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  transactionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: "center",
  },
  categoryText: {
    fontSize: 16,
    fontFamily: "Roboto-SemiBold",
    color: "#111827",
    marginBottom: 2,
  },
  noteText: {
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#6b7280",
  },
  amountContainer: {
    justifyContent: "center",
    alignItems: "flex-end",
    marginLeft: 12,
  },
  amountText: {
    fontSize: 16,
    fontFamily: "Roboto-Bold",
    letterSpacing: 0.5,
  },
});
