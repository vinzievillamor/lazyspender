import React, { useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Card, Divider, IconButton, Menu, SegmentedButtons, Text, useTheme } from 'react-native-paper';
import { customTheme, spacing } from '../config/theme';
import { useAccessContext } from '../contexts/AccessContext';
import { useDebtTrend } from '../hooks/useDebtTrend';
import { DebtAggregation } from '../types/debtTrend';
import { getCategoryColor } from '../utils/categoryColors';

interface RangePreset {
  key: string;
  label: string;
  count: number; // number of months/years back to include, per the active aggregation
}

const MONTHLY_PRESETS: RangePreset[] = [
  { key: 'M6', label: 'Last 6 months', count: 6 },
  { key: 'M12', label: 'Last 12 months', count: 12 },
];

const YEARLY_PRESETS: RangePreset[] = [
  { key: 'Y3', label: 'Last 3 years', count: 3 },
  { key: 'Y5', label: 'Last 5 years', count: 5 },
];

const getPresetsForAggregate = (aggregate: DebtAggregation): RangePreset[] =>
  aggregate === DebtAggregation.MONTHLY ? MONTHLY_PRESETS : YEARLY_PRESETS;

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeDateRange = (aggregate: DebtAggregation, preset: RangePreset): { from: string; to: string } => {
  const today = new Date();
  const to = formatLocalDate(today);

  const from = new Date(today);
  if (aggregate === DebtAggregation.MONTHLY) {
    from.setDate(1);
    from.setMonth(from.getMonth() - (preset.count - 1));
  } else {
    from.setMonth(0, 1);
    from.setFullYear(from.getFullYear() - (preset.count - 1));
  }

  return { from: formatLocalDate(from), to };
};

export const DebtTrendWidget: React.FC = () => {
  const theme = useTheme();
  const { delegatedOwner } = useAccessContext();

  const [aggregate, setAggregate] = useState<DebtAggregation>(DebtAggregation.MONTHLY);
  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(MONTHLY_PRESETS[0].key);
  const [menuVisible, setMenuVisible] = useState(false);

  const presets = useMemo(() => getPresetsForAggregate(aggregate), [aggregate]);

  // Reset the range preset to the new aggregation's default whenever the
  // toggle changes, since month-scoped and year-scoped presets aren't interchangeable.
  useEffect(() => {
    setSelectedPresetKey(presets[0].key);
  }, [presets]);

  const selectedPreset = presets.find((p) => p.key === selectedPresetKey) || presets[0];

  const { from, to } = useMemo(
    () => computeDateRange(aggregate, selectedPreset),
    [aggregate, selectedPreset]
  );

  const { data, isLoading, isFetching, isError, error } = useDebtTrend(
    { from, to, aggregate },
    { enabled: !!delegatedOwner }
  );

  const hasDebt = useMemo(
    () => (data?.dataPoints || []).some((point) => point.totalDebt > 0),
    [data?.dataPoints]
  );

  const legendItems = useMemo(() => {
    if (!data?.dataPoints) return [];

    const totalsByCategory = new Map<string, number>();
    for (const point of data.dataPoints) {
      for (const category of point.categories) {
        totalsByCategory.set(category.category, (totalsByCategory.get(category.category) || 0) + category.amount);
      }
    }

    return Array.from(totalsByCategory.entries())
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a)
      .map(([category]) => ({ category, color: getCategoryColor(category) }));
  }, [data?.dataPoints]);

  const { chartData, chartSpacing, availableWidth } = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) {
      return { chartData: [], chartSpacing: 60, availableWidth: 0 };
    }

    const points = data.dataPoints;
    const totalPoints = points.length;
    const screenWidth = Dimensions.get('window').width;
    const MIN_SPACING = 50;
    const availableWidth = screenWidth - 64 - 40;
    const calculatedSpacing = totalPoints > 1 ? availableWidth / (totalPoints - 1) : availableWidth;
    const spacing = Math.max(MIN_SPACING, calculatedSpacing);

    return {
      chartData: points.map((point) => ({
        label: point.label,
        stacks: point.categories.map((category) => ({
          value: category.amount,
          color: getCategoryColor(category.category),
        })),
      })),
      chartSpacing: spacing,
      availableWidth,
    };
  }, [data?.dataPoints]);

  if (isLoading) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>Loading debt trend...</Text>
        </Card.Content>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card style={styles.card} elevation={0}>
        <Card.Content>
          <Text style={styles.errorText}>Failed to load debt trend</Text>
          <Text style={styles.errorDetails}>{error?.message}</Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card style={styles.card} elevation={0}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="titleLarge" style={styles.title}>
              Debt Trend
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
                onPress={() => setMenuVisible((prev) => !prev)}
                style={styles.menuButton}
              />
            }
            anchorPosition="bottom"
          >
            {presets.map((option) => (
              <Menu.Item
                key={option.key}
                onPress={() => {
                  setSelectedPresetKey(option.key);
                  setTimeout(() => setMenuVisible(false), 1);
                }}
                title={option.label}
                leadingIcon={selectedPresetKey === option.key ? 'check' : undefined}
                style={selectedPresetKey === option.key ? styles.selectedMenuItem : undefined}
              />
            ))}
          </Menu>
        </View>

        <SegmentedButtons
          value={aggregate}
          onValueChange={(value) => setAggregate(value as DebtAggregation)}
          buttons={[
            { value: DebtAggregation.MONTHLY, label: 'Monthly', showSelectedCheck: true },
            { value: DebtAggregation.YEARLY, label: 'Yearly', showSelectedCheck: true },
          ]}
          style={styles.segmentedButtons}
        />

        <Text variant="bodySmall" style={styles.periodLabel}>
          {selectedPreset.label}
        </Text>

        {hasDebt && (
          <View style={styles.totalContainer}>
            <Text variant="headlineLarge" style={styles.totalAmount}>
              {data?.currency || 'PHP'} {data?.totalDebt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
            <Text variant="bodySmall" style={styles.totalLabel}>
              Total Outstanding Debt
            </Text>
          </View>
        )}

        {hasDebt ? (
          <>
            <View style={styles.chartContainer}>
              <BarChart
                data={chartData}
                width={availableWidth}
                height={250}
                spacing={chartSpacing}
                initialSpacing={30}
                endSpacing={20}
                yAxisTextStyle={{ color: theme.colors.onSurface, fontSize: 10 }}
                xAxisLabelTextStyle={{ color: theme.colors.onSurface, fontSize: 10 }}
                yAxisThickness={0}
                xAxisThickness={0}
                xAxisColor={theme.colors.outline}
                maxValue={data?.yAxisConfig?.maxValue}
                stepValue={data?.yAxisConfig?.interval}
                barBorderRadius={4}
                isAnimated
              />
            </View>
            <View style={styles.legendContainer}>
              {legendItems.map((item) => (
                <View key={item.category} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text variant="bodySmall" style={styles.legendLabel}>
                    {item.category}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.noDataContainer}>
            <Text variant="bodyMedium" style={styles.noDataText}>
              No outstanding debt for this period.
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
  segmentedButtons: {
    marginBottom: spacing.sm,
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
  },
  totalLabel: {
    marginTop: spacing.xs,
    color: customTheme.colors.onSurfaceVariant,
  },
  chartContainer: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.sm,
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.xs,
  },
  legendLabel: {
    color: customTheme.colors.onSurfaceVariant,
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
});
