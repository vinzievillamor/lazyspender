import { View, Text, StyleSheet } from "react-native";

interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    backgroundColor: "#e5e7eb",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  sectionHeaderText: {
    fontSize: 14,
    fontFamily: "Roboto-SemiBold",
    color: "#374151",
    textTransform: "uppercase",
  },
});
