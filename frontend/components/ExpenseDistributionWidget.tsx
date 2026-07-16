import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
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

export const ExpenseDistributionWidget: React.FC = () => {
  const theme = useTheme();
  const { delegatedOwner } = useAccessContext();
  const { data: user, isLoading: isUserLoading } = useActiveUser(delegatedOwner);

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TrendPeriod.LAST_12_WEEKS);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
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

  // Transform distribution data for PieChart
  const pieData = useMemo(() => {
    if (!data?.distribution || data.distribution.length === 0) {
      return [];
    }

    return data.distribution.map((item, index) => ({
      value: item.amount,
      color: getCategoryColor(item.category),
      focused: focusedIndex === index,
      onPress: () => {
        setFocusedIndex(index);
        // Toggle expansion for this category
        setExpandedCategory(prev =>
          prev === item.category ? null : item.category
        );
      },
    }));
  }, [data?.distribution, focusedIndex]);

  // Get focused item data for center label display
  const focusedItem = useMemo(() => {
    if (!data?.distribution || data.distribution.length === 0) return null;
    return data.distribution[focusedIndex] || data.distribution[0];
  }, [focusedIndex, data?.distribution]);

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
                  setFocusedIndex(0);
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
        {pieData.length > 0 && (
          <View style={styles.totalContainer}>
            <Text variant="headlineLarge" style={styles.totalAmount}>
              {data?.currency || 'PHP'} {data?.totalExpense.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text variant="bodySmall" style={styles.totalLabel}>
              Total Expenses
            </Text>
          </View>
        )}

        {/* Pie Chart */}
        {pieData.length > 0 ? (
          <View style={styles.chartContainer}>
            <PieChart
              data={pieData}
              donut
              radius={100}
              innerRadius={60}
              innerCircleColor={customTheme.colors.surface}
              centerLabelComponent={() => (
                focusedItem && (
                  <View style={styles.centerLabel}>
                    <Text variant="labelMedium" style={styles.centerCategory} numberOfLines={2}>
                      {focusedItem.category}
                    </Text>
                    <Text variant="bodySmall" style={styles.centerAmount}>
                      {data?.currency} {focusedItem.amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text variant="labelLarge" style={styles.centerPercentage}>
                      {focusedItem.percentage.toFixed(1)}%
                    </Text>
                  </View>
                )
              )}
              focusOnPress
            />
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

        {/* Top 10 Contributors Section (Expandable) */}
        {expandedCategory && focusedItem && (
          <View style={styles.contributorsSection}>
            <View style={styles.contributorsHeader}>
              <View style={[styles.expandIndicator, { backgroundColor: getCategoryColor(expandedCategory) }]} />
              <Text variant="titleSmall" style={styles.contributorsTitle}>
                {expandedCategory}
              </Text>
              <IconButton
                icon="close"
                size={20}
                onPress={() => setExpandedCategory(null)}
                style={styles.closeButton}
              />
            </View>
            <TopContributorsList
              contributors={contributorsData?.contributors || []}
              currency={data?.currency || 'PHP'}
              isLoading={isContributorsLoading}
              categoryColor={getCategoryColor(expandedCategory)}
            />
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
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  centerLabel: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 100,
  },
  centerCategory: {
    fontWeight: '600',
    textAlign: 'center',
  },
  centerAmount: {
    color: customTheme.colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  centerPercentage: {
    color: customTheme.colors.primary,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  legendContainer: {
    gap: spacing.sm,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.sm,
  },
  legendTextContainer: {
    flex: 1,
  },
  legendCategory: {
    fontWeight: '500',
  },
  legendAmount: {
    color: customTheme.colors.onSurfaceVariant,
    fontSize: 11,
  },
  legendPercentage: {
    fontWeight: '600',
    minWidth: 50,
    textAlign: 'right',
  },
  contributorsSection: {
    marginTop: spacing.md,
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: customTheme.roundness,
    padding: spacing.md,
  },
  contributorsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expandIndicator: {
    width: 4,
    height: 20,
    borderRadius: 2,
    marginRight: spacing.sm,
  },
  contributorsTitle: {
    flex: 1,
    fontWeight: '600',
  },
  closeButton: {
    margin: 0,
  },
});
