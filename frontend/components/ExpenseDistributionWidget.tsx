import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ActivityIndicator, Card, Divider, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { customColors, customTheme, spacing } from '../config/theme';
import { useAccessContext } from '../contexts/AccessContext';
import { useExpenseDistribution, useTopContributors } from '../hooks/useExpenseDistribution';
import { useActiveUser } from '../hooks/useUsers';
import { TrendPeriod } from '../types/balanceTrend';
import { getCategoryColor } from '../utils/categoryColors';
import { TopContributorsList } from './TopContributorsList';

const PERIOD_OPTIONS = [
  { value: TrendPeriod.LAST_12_WEEKS, label: 'Last 12 weeks' },
  { value: TrendPeriod.LAST_YEAR, label: 'Last year' },
  { value: TrendPeriod.FROM_START, label: 'From start' },
];

const getPeriodLabel = (period: TrendPeriod): string => {
  const option = PERIOD_OPTIONS.find(opt => opt.value === period);
  return option?.label || 'From Start';
};

// Minimum visible sliver for the fill bar so a small-but-nonzero category
// doesn't render as an invisible 0-width bar.
const MIN_FILL_PERCENT = 3;

const formatAmount = (amount: number): string =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const ExpenseDistributionWidget: React.FC = () => {
  const theme = useTheme();
  const { delegatedOwner } = useAccessContext();
  const { data: user, isLoading: isUserLoading } = useActiveUser(delegatedOwner);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TrendPeriod.LAST_12_WEEKS);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  // Initialize with first category expanded (will be set when data loads)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // Reset the expanded category whenever the active profile changes.
  React.useEffect(() => {
    setExpandedCategory(null);
    setInitialLoadDone(false);
  }, [delegatedOwner]);

  // Reset the account filter whenever the active profile changes, then
  // repopulate it from that profile's own accounts once they load. Tracked
  // via a ref (not selectedAccounts.length === 0) because delegatedOwner and
  // user?.accounts can change together in the same render (e.g. cached user
  // data resolving instantly on profile switch) - splitting this into two
  // separate effects raced on a stale selectedAccounts closure and could
  // leave the filter stuck empty, showing "no accounts configured" for an
  // account that actually has data.
  const populatedOwnerRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (populatedOwnerRef.current === delegatedOwner) return;
    if (!user?.accounts) {
      setSelectedAccounts([]);
      return;
    }
    setSelectedAccounts(user.accounts);
    populatedOwnerRef.current = delegatedOwner;
  }, [delegatedOwner, user?.accounts]);

  const { data, isLoading, isFetching, isError, error } = useExpenseDistribution(
    {
      owner: delegatedOwner,
      accounts: selectedAccounts,
      period: selectedPeriod,
    },
    {
      enabled: !!delegatedOwner && selectedAccounts.length > 0,
    }
  );

  // Fetch contributors when a category is expanded
  const { data: contributorsData, isLoading: isContributorsLoading } = useTopContributors(
    {
      owner: delegatedOwner,
      category: expandedCategory || '',
      period: selectedPeriod,
    },
    {
      enabled: !!delegatedOwner && !!expandedCategory,
    }
  );

  // Set initial expanded category when distribution data loads
  React.useEffect(() => {
    if (!initialLoadDone && data?.distribution && data.distribution.length > 0) {
      setExpandedCategory(data.distribution[0].category);
      setInitialLoadDone(true);
    }
  }, [data?.distribution, initialLoadDone]);

  // Transform distribution data into rows - one per category, sorted
  // descending (already sorted that way by the backend). Each row's fill bar
  // width is a plain CSS percentage relative to the largest category, so the
  // layout scales with the card's own width instead of a captured window
  // width snapshot.
  const rows = useMemo(() => {
    if (!data?.distribution || data.distribution.length === 0) {
      return [];
    }

    const maxAmount = data.distribution[0].amount;

    return data.distribution.map(item => ({
      category: item.category,
      amount: item.amount,
      percentage: item.percentage,
      color: getCategoryColor(item.category),
      fillPercent: maxAmount > 0 ? Math.max((item.amount / maxAmount) * 100, MIN_FILL_PERCENT) : 0,
      isExpanded: expandedCategory === item.category,
    }));
  }, [data?.distribution, expandedCategory]);

  if (isUserLoading || isLoading) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading expense distribution...</Text>
        </Card.Content>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content>
          <Text style={styles.errorText}>Failed to load expense distribution</Text>
          <Text style={styles.errorDetails}>{error?.message}</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card} elevation={0}>
      <Card.Content>
        {/* Header with Period Menu */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="titleLarge" style={styles.title}>
              Expense Distribution
            </Text>
            {isFetching && <ActivityIndicator size="small" style={styles.titleSpinner} />}
          </View>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="dots-vertical"
                size={24}
                onPress={() => setMenuVisible(prev => !prev)}
                style={styles.menuButton}
              />
            }
            anchorPosition="bottom"
          >
            {PERIOD_OPTIONS.map((option) => (
              <Menu.Item
                key={option.value}
                onPress={() => {
                  setSelectedPeriod(option.value);
                  setTimeout(() => setMenuVisible(false), 1);
                }}
                title={option.label}
                leadingIcon={selectedPeriod === option.value ? 'check' : undefined}
                style={selectedPeriod === option.value ? styles.selectedMenuItem : undefined}
              />
            ))}
          </Menu>
        </View>

        {/* Period Label */}
        <Text variant="bodySmall" style={styles.periodLabel}>
          {getPeriodLabel(selectedPeriod)}
        </Text>

        {/* Total Expense */}
        {rows.length > 0 && (
          <View style={styles.totalContainer}>
            <Text variant="headlineLarge" style={styles.totalAmount}>
              {data?.currency || 'PHP'} {data?.totalExpense.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text variant="bodySmall" style={styles.totalLabel}>
              Total Expenses
            </Text>
          </View>
        )}

        {/* Category breakdown - proportional bars, one row per category, each
            expandable in place to show its top contributors underneath it. */}
        {rows.length > 0 ? (
          <View style={styles.chartContainer}>
            {rows.map(row => (
              <View key={row.category} style={styles.categoryGroup}>
                <Pressable
                  onPress={() => setExpandedCategory(prev => (prev === row.category ? null : row.category))}
                  style={styles.barRow}
                >
                  <View style={styles.barRowHeader}>
                    <View style={styles.barRowLabel}>
                      <View style={[styles.categoryDot, { backgroundColor: row.color }]} />
                      <Text
                        variant="bodyMedium"
                        style={[styles.categoryName, row.isExpanded && styles.categoryNameExpanded]}
                        numberOfLines={1}
                      >
                        {row.category}
                      </Text>
                      <IconButton
                        icon={row.isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={16}
                        style={styles.expandChevron}
                        onPress={() => setExpandedCategory(prev => (prev === row.category ? null : row.category))}
                      />
                    </View>
                    <Text variant="labelSmall" style={styles.barValueLabel}>
                      {formatAmount(row.amount)} ({row.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.trackFill, { width: `${row.fillPercent}%`, backgroundColor: row.color }]} />
                  </View>
                </Pressable>

                {row.isExpanded && (
                  <View style={styles.contributorsSection}>
                    <TopContributorsList
                      contributors={contributorsData?.contributors || []}
                      currency={data?.currency || 'PHP'}
                      isLoading={isContributorsLoading}
                      categoryColor={row.color}
                    />
                  </View>
                )}
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text variant="bodyMedium" style={styles.noDataText}>
              {selectedAccounts.length === 0
                ? 'No accounts configured. Add an account to see your expense distribution.'
                : 'No expense data available for the selected period.'}
            </Text>
          </View>
        )}

        <Divider style={styles.divider} />
      </Card.Content>
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: customTheme.colors.surface,
    borderRadius: customTheme.roundness,
    marginBottom: spacing.lg,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    marginTop: spacing.md,
  },
  errorText: {
    color: customTheme.colors.error,
    marginBottom: spacing.sm,
  },
  errorDetails: {
    fontSize: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    fontWeight: '600',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleSpinner: {
    marginLeft: spacing.sm,
  },
  menuButton: {
    margin: 0,
  },
  selectedMenuItem: {
    backgroundColor: customTheme.colors.primaryContainer,
  },
  periodLabel: {
    color: customTheme.colors.onSurfaceVariant,
    marginBottom: spacing.md,
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  totalAmount: {
    fontWeight: '700',
    color: customColors.expense,
  },
  totalLabel: {
    marginTop: spacing.xs,
    color: customTheme.colors.onSurfaceVariant,
  },
  chartContainer: {
    paddingVertical: spacing.md,
  },
  categoryGroup: {
    marginBottom: spacing.md,
  },
  barRow: {
    paddingVertical: spacing.xs,
  },
  barRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  barRowLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginRight: spacing.sm,
  },
  categoryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  categoryName: {
    color: customTheme.colors.onSurfaceVariant,
    flexShrink: 1,
  },
  categoryNameExpanded: {
    color: customTheme.colors.onSurface,
    fontWeight: '700',
  },
  expandChevron: {
    margin: 0,
    marginLeft: -spacing.xs,
  },
  barValueLabel: {
    color: customTheme.colors.onSurfaceVariant,
    flexShrink: 0,
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: customTheme.colors.surfaceVariant,
    overflow: 'hidden',
  },
  trackFill: {
    height: '100%',
    borderRadius: 4,
  },
  noDataContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  noDataText: {
    textAlign: 'center',
  },
  divider: {
    marginVertical: spacing.lg,
  },
  contributorsSection: {
    marginTop: spacing.sm,
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: customTheme.roundness,
    padding: spacing.md,
  },
});
