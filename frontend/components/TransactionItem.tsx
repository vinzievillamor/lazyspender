import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';
import { Transaction } from "../types/transaction";

interface TransactionItemProps {
  transaction: Transaction;
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

export default function TransactionItem({ transaction }: TransactionItemProps) {
  const isIncome = transaction.amount > 0;

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
          {isIncome ? '+' : ''}{transaction.amount.toFixed(2)}
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
