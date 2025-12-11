import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

interface SectionHeaderProps {
  title: string;
}

export default function SectionHeader({ title }: SectionHeaderProps) {
  const theme = useTheme();

  return (
    <View style={[styles.sectionHeader, { backgroundColor: theme.colors.elevation.level1 }]}>
      <Text variant="labelLarge" style={[styles.sectionHeaderText, { color: theme.colors.primary }]}>
        {title}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionHeaderText: {
    fontWeight: '600',
  },
});
