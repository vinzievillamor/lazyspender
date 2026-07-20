import { ScrollView, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { spacing } from "../config/theme";
import { featureFlags } from "../config/featureFlags";
import { BalanceTrendWidget } from "../components/BalanceTrendWidget";
import { DebtTrendWidget } from "../components/DebtTrendWidget";
import { ExpenseDistributionWidget } from "../components/ExpenseDistributionWidget";

export default function Dashboard() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <BalanceTrendWidget />
        <ExpenseDistributionWidget />
        {featureFlags.debtTrendWidget && <DebtTrendWidget />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
});
