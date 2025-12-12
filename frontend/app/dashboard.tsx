import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Text, useTheme } from "react-native-paper";

export default function Dashboard() {
  const theme = useTheme();

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.content}>
        <Card style={styles.card}>
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
    paddingVertical: 16,
  },
  header: {
    fontWeight: "bold",
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  subtitle: {
    paddingHorizontal: 16,
    opacity: 0.7,
    marginBottom: 8,
  },
  card: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontWeight: "600",
    marginBottom: 8,
  },
  placeholderText: {
    opacity: 0.6,
  },
});
