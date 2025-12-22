import React, { useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Card, Divider, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { customTheme, spacing } from '../config/theme';
import { useUser } from '../contexts/UserContext';
import { useBalanceTrend } from '../hooks/useBalanceTrend';
import { TrendPeriod } from '../types/balanceTrend';

const PERIOD_OPTIONS = [
  { value: TrendPeriod.LAST_12_WEEKS, label: 'Last 12 weeks' },
  { value: TrendPeriod.LAST_YEAR, label: 'Last year' },
  { value: TrendPeriod.FROM_START, label: 'From start' },
];

const getPeriodLabel = (period: TrendPeriod): string => {
  const option = PERIOD_OPTIONS.find(opt => opt.value === period);
  return option?.label || 'From Start';
};

export const BalanceTrendWidget: React.FC = () => {
  const theme = useTheme();
  const { user, isLoading: isUserLoading } = useUser();

  const [selectedPeriod, setSelectedPeriod] = useState<TrendPeriod>(TrendPeriod.FROM_START);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(user?.accounts || []);
  const [menuVisible, setMenuVisible] = useState(false);

  // Update selected accounts when user data loads
  React.useEffect(() => {
    if (user?.accounts && selectedAccounts.length === 0) {
      setSelectedAccounts(user.accounts);
    }
  }, [user?.accounts]);

  const { data, isLoading, isError, error } = useBalanceTrend(
    {
      owner: user?.owner || '',
      accounts: selectedAccounts,
      period: selectedPeriod,
    },
    {
      enabled: !!user?.owner && selectedAccounts.length > 0,
    }
  );

  const toggleAccount = (account: string) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(account)) {
        // Don't allow deselecting all accounts
        if (prev.length === 1) return prev;
        return prev.filter((a) => a !== account);
      }
      return [...prev, account];
    });
  };

  // Prepare chart data with proper spacing to prevent label cutoff
  const { chartData, chartSpacing, shouldScroll, availableWidth } = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) {
      return { chartData: [], chartSpacing: 60, shouldScroll: false };
    }

    const points = data.dataPoints;
    const totalPoints = points.length;
    const screenWidth = Dimensions.get('window').width;

    // Minimum spacing needed to prevent label cutoff (increased from 30 to 50)
    const MIN_SPACING = 50;

    // Account for card padding and margins (approximately 32px on each side)
    const availableWidth = screenWidth - 64 - 40; // 64 for card padding, 40 for chart initial/end spacing

    // Calculate spacing to fit all points within available width
    const calculatedSpacing = totalPoints > 1 ? availableWidth / (totalPoints - 1) : availableWidth;

    // Use minimum spacing if calculated spacing is too small
    const spacing = Math.max(MIN_SPACING, calculatedSpacing);

    // Determine if chart needs horizontal scrolling
    const needsScroll = spacing === MIN_SPACING && calculatedSpacing < MIN_SPACING;

    return {
      chartData: points.map((point) => ({
        value: point.balance,
        label: point.label,
        dataPointText: point.balance.toFixed(0),
      })),
      chartSpacing: spacing,
      shouldScroll: needsScroll,
      availableWidth: availableWidth
    };
  }, [data?.dataPoints]);

  if (isUserLoading || isLoading) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading balance trend...</Text>
        </Card.Content>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content>
          <Text style={styles.errorText}>Failed to load balance trend</Text>
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
          <Text variant="titleLarge" style={styles.title}>
            Balance Trend
          </Text>
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

        {/* Total Balance */}
        <View style={styles.balanceContainer}>
          <Text variant="headlineLarge" style={styles.balanceAmount}>
            {data?.currency || 'PHP'} {data?.totalBalance.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </Text>
          <Text variant="bodySmall" style={styles.balanceLabel}>
            Total Balance
          </Text>
        </View>

        {/* Line Chart */}
        {chartData.length > 0 ? (
          <View style={styles.chartContainer}>
            <LineChart
              data={chartData}
              width={availableWidth}
              height={250}
              spacing={chartSpacing}
              endSpacing={20}
              initialSpacing={50}
              color={theme.colors.primary}
              startFillColor={theme.colors.primary}
              endFillColor={theme.colors.primaryContainer}
              startOpacity={0.4}
              endOpacity={0.1}
              areaChart
              hideDataPoints={false}
              dataPointsColor={theme.colors.primary}
              dataPointsRadius={4}
              textColor1={theme.colors.onSurface}
              textShiftY={-15}
              textShiftX={-15}
              yAxisTextStyle={{ color: theme.colors.onSurface, fontSize: 10, }}
              xAxisLabelTextStyle={{ color: theme.colors.onSurface, fontSize: 10, }}
              yAxisThickness={0}
              xAxisThickness={0}
              xAxisColor={theme.colors.outline}
              stepValue={data?.yaxisConfig?.interval}
              maxValue={data?.yaxisConfig?.maxValue}
              curved
              showScrollIndicator
              scrollToIndex={chartData.length - 1}
              isAnimated
            />
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Text variant="bodyMedium" style={styles.noDataText}>
              No transaction data available for the selected period and accounts.
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
  balanceContainer: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
  },
  balanceAmount: {
    fontWeight: '700',
  },
  balanceLabel: {
    marginTop: spacing.xs,
    color: customTheme.colors.onSurfaceVariant
  },
  chartContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
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
  accountsSection: {
    marginTop: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checkboxContainer: {
    gap: spacing.xs,
  },
  checkboxItem: {
    marginLeft: -spacing.sm,
  },
  checkboxLabel: {
    fontSize: 14,
  },
});
