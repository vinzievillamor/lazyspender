import { CreateTransactionRequest } from "@/services/transaction.service";
import { useIsFocused } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { ActivityIndicator, Button, FAB, Text, useTheme } from "react-native-paper";
import TransactionFormModal from "../components/TransactionFormModal";
import TransactionItem from "../components/TransactionItem";
import TransactionItemHeader from "../components/TransactionItemHeader";
import { spacing } from "../config/theme";
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
  const theme = useTheme();
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [clickedTransaction, setClickedTransaction] = useState<CreateTransactionRequest>();
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
      <View style={[styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" />
        <Text variant="bodyLarge" style={styles.loadingText}>Loading transactions...</Text>
      </View>
    );
  }

  if (isError) {
    return (
      <View style={[styles.centerContent, { backgroundColor: theme.colors.background }]}>
        <Text variant="bodyLarge" style={styles.errorText}>
          {error instanceof Error ? error.message : 'Failed to load transactions. Please try again.'}
        </Text>
        <Button mode="contained" onPress={() => refetch()} style={styles.retryButton}>
          Retry
        </Button>
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
      return <TransactionItemHeader title={item.title!} />;
    }

    return <TransactionItem transaction={item.item!} onPress={() => showFilledModal(item.item!)} />;
  };

  const showFilledModal = (transaction: Transaction) => {
    const ctr: CreateTransactionRequest = {
      id: transaction.id,
      owner: transaction.owner,
      account: transaction.account,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date,
      currency: transaction.currency,
      refCurrencyAmount: transaction.refCurrencyAmount,
      type: transaction.type,
      note: transaction.note
    };
    setClickedTransaction(ctr);
    setIsModalVisible(true);
  }

  const renderFooter = () => {
    if (!isFetchingNextPage) return null;

    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" />
        <Text variant="bodyMedium" style={styles.footerText}>Loading more...</Text>
      </View>
    );
  };

  const handleEndReached = () => {
    if (isFocused && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  const handleModalClose = () => {
    setIsModalVisible(false);
    setClickedTransaction(undefined);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={(_item: any, index: number) => index.toString()}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        ListFooterComponent={renderFooter}
      />

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => setIsModalVisible(true)}
      />

      <TransactionFormModal
        key={clickedTransaction?.id || 'new'}
        visible={isModalVisible}
        onClose={handleModalClose}
        initialData={clickedTransaction}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorText: {
    textAlign: "center",
    paddingHorizontal: spacing.xl,
  },
  footerLoader: {
    paddingVertical: spacing.xl,
    alignItems: "center",
  },
  footerText: {
    marginTop: spacing.sm,
  },
  retryButton: {
    marginTop: spacing.lg,
    borderRadius: 12,
  },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: spacing.lg,
    borderRadius: 16,
  },
});
