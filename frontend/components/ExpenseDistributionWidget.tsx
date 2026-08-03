import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
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

const BAR_WIDTH = 20;
const BAR_SPACING = 18;
const Y_AXIS_LABEL_WIDTH = 130;

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

  // Chart width available inside the card, mirroring DebtTrendWidget's
  // responsive sizing (screen width minus card padding).
  const availableWidth = Dimensions.get('window').width - 64 - 40;

  // Transform distribution data for the horizontal BarChart - one bar per
  // category, sorted descending (already sorted that way by the backend).
  const barData = useMemo(() => {
    if (!data?.distribution || data.distribution.length === 0) {
      return [];
    }

    return data.distribution.map(item => {
      const color = getCategoryColor(item.category);
      const isExpanded = expandedCategory === item.category;

      return {
        value: item.amount,
        label: item.category,
        frontColor: color,
        labelTextStyle: {
          color: isExpanded ? theme.colors.onSurface : theme.colors.onSurfaceVariant,
          fontWeight: isExpanded ? ('700' as const) : ('400' as const),
          fontSize: 10,
        },
        topLabelComponent: () => (
          <Text variant="labelSmall" style={styles.barValueLabel}>
            {formatAmount(item.amount)} ({item.percentage.toFixed(1)}%)
          </Text>
        ),
        onPress: () => {
          setExpandedCategory(prev => (prev === item.category ? null : item.category));
        },
      };
    });
  }, [data?.distribution, expandedCategory, theme.colors.onSurface, theme.colors.onSurfaceVariant]);

  const barChartMaxValue = useMemo(() => {
    if (!data?.distribution || data.distribution.length === 0) return undefined;
    return Math.ceil((data.distribution[0].amount * 1.15) / 100) * 100;
  }, [data?.distribution]);

  const chartHeight = barData.length * (BAR_WIDTH + BAR_SPACING) + BAR_SPACING;

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
        {barData.length > 0 && (
          <View style={styles.totalContainer}>
            <Text variant="headlineLarge" style={styles.totalAmount}>
              {data?.currency || 'PHP'} {data?.totalExpense.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text variant="bodySmall" style={styles.totalLabel}>
              Total Expenses
            </Text>
          </View>
        )}

        {/* Horizontal Bar Chart */}
        {barData.length > 0 ? (
          <View style={styles.chartContainer}>
            <BarChart
              key={`${selectedPeriod}-${delegatedOwner}-${barData.length}`}
              data={barData}
              horizontal
              intactTopLabel
              width={availableWidth - Y_AXIS_LABEL_WIDTH}
              height={chartHeight}
              barWidth={BAR_WIDTH}
              spacing={BAR_SPACING}
              initialSpacing={BAR_SPACING}
              endSpacing={BAR_SPACING}
              yAxisLabelWidth={Y_AXIS_LABEL_WIDTH}
              rotateYAxisTexts={0}
              yAxisTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurfaceVariant, fontSize: 10 }}
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisColor={theme.colors.outline}
              maxValue={barChartMaxValue}
              barBorderRadius={4}
              disableScroll
              isAnimated
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
        {expandedCategory && (
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
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  barValueLabel: {
    color: customTheme.colors.onSurfaceVariant,
    marginLeft: spacing.xs,
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
