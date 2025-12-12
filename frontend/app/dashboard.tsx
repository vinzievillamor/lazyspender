import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";
import { shadows, spacing } from "../config/theme";

export default function Dashboard() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.card} elevation={0}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              More insights coming soon...
            </Text>
            <Text variant="bodyMedium" style={styles.placeholderText}>
              Additional metrics, statistics, and predictions will be displayed here.
            </Text>
          </Card.Content>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: spacing.lg,
  },
  header: {
    fontWeight: "bold",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
  },
  subtitle: {
    paddingHorizontal: spacing.lg,
    opacity: 0.7,
    marginBottom: spacing.sm,
  },
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.sm,
    borderRadius: 20,
    ...shadows.md,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: spacing.sm,
  },
  placeholderText: {
    opacity: 0.6,
  },
});
