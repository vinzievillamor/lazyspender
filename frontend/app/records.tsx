import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { FlashList } from "@shopify/flash-list";
import { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import SectionHeader from "../components/SectionHeader";
import TransactionFormModal from "../components/TransactionFormModal";
import TransactionItem from "../components/TransactionItem";
import { useTransactions } from "../hooks/useTransactions";
import { Transaction } from "../types/transaction";

const PAGE_SIZE = 20;

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const isFocused = useIsFocused();

  const {
    data,
    isLoading,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = useTransactions({ pageSize: PAGE_SIZE, enabled: isFocused });

  const transactions = useMemo(() => {
    return data?.pages.flatMap((page) => page.content) ?? [];
  }, [data]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load transactions. Please try again.'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
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

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#007AFF" />
        <Text style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (isFocused && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(_item, index) => index.toString()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />

      <TouchableOpacity
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      <TransactionFormModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
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
    fontFamily: "Roboto-Regular",
    color: "#6b7280",
  },
  errorText: {
    fontSize: 16,
    fontFamily: "Roboto-Medium",
    color: "#ef4444",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    marginTop: 8,
    fontSize: 14,
    fontFamily: "Roboto-Regular",
    color: "#6b7280",
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: "#007AFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontFamily: "Roboto-Medium",
    color: "#ffffff",
  },
  fab: {
    position: "absolute",
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
