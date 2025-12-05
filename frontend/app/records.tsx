import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useState, useEffect } from "react";
import { Transaction } from "../types/transaction";
import TransactionItem from "../components/TransactionItem";
import SectionHeader from "../components/SectionHeader";
import { getAllTransactions } from "../services/transaction.service";

interface SectionData {
  title: string;
  data: Transaction[];
}

// Group transactions by date
const groupByDate = (transactions: Transaction[]): SectionData[] => {
  const groups: { [key: string]: Transaction[] } = {};

  transactions.forEach(transaction => {
    const date = new Date(transaction.date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dateKey: string;
    if (date.toDateString() === today.toDateString()) {
      dateKey = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateKey = 'Yesterday';
    } else {
      dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }

    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(transaction);
  });

  return Object.entries(groups).map(([title, data]) => ({ title, data }));
};

export default function Records() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAllTransactions({ page: 0, size: 100 });
      setTransactions(response.content);
    } catch (err) {
      setError('Failed to load transactions. Please try again.');
      console.error('Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const sections = groupByDate(transactions);

  // Flatten sections for FlashList
  const flatData: Array<{ type: 'header' | 'item'; title?: string; item?: Transaction }> = [];
  sections.forEach(section => {
    flatData.push({ type: 'header', title: section.title });
    section.data.forEach(item => {
      flatData.push({ type: 'item', item });
    });
  });

  const renderItem = ({ item }: { item: { type: 'header' | 'item'; title?: string; item?: Transaction } }) => {
    if (item.type === 'header') {
      return <SectionHeader title={item.title!} />;
    }

    return <TransactionItem transaction={item.item!} />;
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(_item, index) => index.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
