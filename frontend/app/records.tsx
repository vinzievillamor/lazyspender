import { View, StyleSheet } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Transaction } from "../types/transaction";
import TransactionItem from "../components/TransactionItem";
import SectionHeader from "../components/SectionHeader";

interface SectionData {
  title: string;
  data: Transaction[];
}

// Sample data from the CSV
const SAMPLE_DATA: Transaction[] = [
  { id: '1', category: 'Transportation', note: '', amount: -112.00, date: '2025-12-03' },
  { id: '2', category: 'Groceries', note: 'korean shop', amount: -832.00, date: '2025-12-02' },
  { id: '3', category: 'Sports + Active', note: '', amount: -510.00, date: '2025-12-02' },
  { id: '4', category: 'Software, apps, games', note: 'claude', amount: -1200.00, date: '2025-12-02' },
  { id: '5', category: 'Restaurant, fast-food', note: 'mcdo', amount: -527.00, date: '2025-12-02' },
  { id: '6', category: 'Holiday, trips, hotels', note: 'sogo', amount: -2000.00, date: '2025-12-02' },
  { id: '7', category: 'Groceries', note: '7 eleven', amount: -900.00, date: '2025-12-02' },
  { id: '8', category: 'Parking', note: '', amount: -60.00, date: '2025-12-01' },
  { id: '9', category: 'Restaurant, fast-food', note: 'itallianis', amount: -2593.00, date: '2025-11-30' },
  { id: '10', category: 'Parking', note: '', amount: -60.00, date: '2025-11-30' },
  { id: '11', category: 'Bar, cafe', note: 'starbucks', amount: -965.00, date: '2025-11-30' },
  { id: '12', category: 'Restaurant, fast-food', note: 'chars garden cafe', amount: -4070.00, date: '2025-11-29' },
  { id: '13', category: 'Groceries', note: '', amount: -200.00, date: '2025-11-29' },
  { id: '14', category: 'Restaurant, fast-food', note: 'mcdo', amount: -1075.00, date: '2025-11-29' },
  { id: '15', category: 'Parking', note: '', amount: -120.00, date: '2025-11-28' },
  { id: '16', category: 'Income', note: '', amount: 53341.00, date: '2025-11-28' },
  { id: '17', category: 'Restaurant, fast-food', note: 'romantic baboy', amount: -1300.00, date: '2025-11-28' },
  { id: '18', category: 'Restaurant, fast-food', note: 'ramen kuroda', amount: -920.00, date: '2025-11-27' },
  { id: '19', category: 'Parking', note: '', amount: -60.00, date: '2025-11-27' },
];

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
  const sections = groupByDate(SAMPLE_DATA);

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
});
