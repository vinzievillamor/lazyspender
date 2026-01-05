import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';
import { customTheme, spacing } from '../config/theme';
import type { ContributorItem } from '../types/expenseDistribution';

interface TopContributorsListProps {
  contributors: ContributorItem[];
  currency: string;
  isLoading: boolean;
  categoryColor: string;
}

const capitalizeFirstLetter = (text: string): string => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const TopContributorsList: React.FC<TopContributorsListProps> = ({
  contributors,
  currency,
  isLoading,
  categoryColor,
}) => {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" />
      </View>
    );
  }

  if (contributors.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="bodySmall" style={styles.emptyText}>
          No contributors with notes found
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text variant="labelMedium" style={styles.header}>
        Top 10 Contributors
      </Text>
      {contributors.map((contributor, index) => (
        <View key={contributor.note} style={styles.contributorRow}>
          <View style={[styles.rankBadge, { backgroundColor: categoryColor }]}>
            <Text style={styles.rankText}>{index + 1}</Text>
          </View>
          <View style={styles.contributorInfo}>
            <Text variant="bodyMedium" style={styles.noteName} numberOfLines={1}>
              {capitalizeFirstLetter(contributor.note)}
            </Text>
            <Text variant="bodySmall" style={styles.countText}>
              {contributor.count} transaction{contributor.count !== 1 ? 's' : ''}
            </Text>
          </View>
          <Text variant="bodyMedium" style={styles.amount}>
            {currency} {Math.abs(contributor.amount).toLocaleString('en-PH', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  loadingContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyContainer: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  emptyText: {
    color: customTheme.colors.onSurfaceVariant,
  },
  header: {
    fontWeight: '600',
    marginBottom: spacing.sm,
    color: customTheme.colors.onSurfaceVariant,
  },
  contributorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  rankBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  rankText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  contributorInfo: {
    flex: 1,
  },
  noteName: {
    fontWeight: '500',
  },
  countText: {
    color: customTheme.colors.onSurfaceVariant,
    fontSize: 11,
  },
  amount: {
    fontWeight: '600',
    marginLeft: spacing.sm,
  },
});
