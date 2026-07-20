import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { ActivityIndicator, Card, Divider, IconButton, Menu, Text, useTheme } from 'react-native-paper';
import { customColors, customTheme, spacing } from '../config/theme';
import { useAccessContext } from '../contexts/AccessContext';
import { useDebtTrend } from '../hooks/useDebtTrend';
import { DebtAggregation } from '../types/debtTrend';

interface RangePreset {
  key: string;
  label: string;
  count: number; // number of months back to include
}

const MONTHLY_PRESETS: RangePreset[] = [
  { key: 'M6', label: 'Last 6 months', count: 6 },
  { key: 'M12', label: 'Last 12 months', count: 12 },
];

// gifted-charts reserves this width for y-axis labels when yAxisLabelWidth
// isn't overridden; needed to anchor the segment tooltip to its bar.
const Y_AXIS_LABEL_WIDTH = 35;
const TOOLTIP_WIDTH = 150;

// The backend labels each debt by its planned payment's note (free text), so
// colors can't come from the fixed category map - assign palette colors per
// label, largest debt first.
const SERIES_PALETTE = [
  customColors.iconForegrounds.blue,
  customColors.iconForegrounds.orange,
  customColors.iconForegrounds.green,
  customColors.iconForegrounds.purple,
  customColors.iconForegrounds.pink,
  customColors.iconForegrounds.teal,
  customColors.iconForegrounds.amber,
  customColors.iconForegrounds.indigo,
  customColors.iconForegrounds.deepOrange,
  customColors.iconForegrounds.cyan,
  customColors.iconForegrounds.magenta,
  customColors.iconForegrounds.lightGreen,
];
const FALLBACK_SERIES_COLOR = customColors.iconForegrounds.gray;

interface TappedSegment {
  monthIndex: number;
  category: string;
  amount: number;
}

const formatLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const computeDateRange = (preset: RangePreset): { from: string; to: string } => {
  const today = new Date();
  const to = formatLocalDate(today);

  const from = new Date(today);
  from.setDate(1);
  from.setMonth(from.getMonth() - (preset.count - 1));

  return { from: formatLocalDate(from), to };
};

const formatAmount = (amount: number): string =>
  amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Debt labels come from free-text payment notes, so normalize casing for
// display (e.g. "car amortization" -> "Car Amortization").
const toTitleCase = (label: string): string =>
  label.replace(/\w\S*/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());

const CHART_HEIGHT = 250;
// Ensure every debt segment renders at least this tall so small debts stay
// visible and tappable next to large ones (e.g. an amortization). Only the
// rendered height is padded - tooltips and the breakdown show real amounts.
const MIN_SEGMENT_PX = 6;

export const DebtTrendWidget: React.FC = () => {
  const theme = useTheme();
  const { delegatedOwner } = useAccessContext();

  const [selectedPresetKey, setSelectedPresetKey] = useState<string>(MONTHLY_PRESETS[0].key);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [tappedSegment, setTappedSegment] = useState<TappedSegment | null>(null);

  const selectedPreset =
    MONTHLY_PRESETS.find((p) => p.key === selectedPresetKey) || MONTHLY_PRESETS[0];

  const { from, to } = useMemo(() => computeDateRange(selectedPreset), [selectedPreset]);

  const { data, isLoading, isFetching, isError, error } = useDebtTrend(
    { owner: delegatedOwner, from, to, aggregate: DebtAggregation.MONTHLY },
    { enabled: !!delegatedOwner }
  );

  const pointCount = data?.dataPoints?.length ?? 0;

  // Default the always-visible breakdown to the most recent month, and drop
  // any tooltip/selection pointing into a previous range or profile.
  useEffect(() => {
    setSelectedMonthIndex(pointCount > 0 ? pointCount - 1 : null);
    setTappedSegment(null);
  }, [pointCount, from, to, delegatedOwner]);

  const hasDebt = useMemo(
    () => (data?.dataPoints || []).some((point) => point.totalDebt > 0),
    [data?.dataPoints]
  );

  // Series are ordered by their total debt across the whole period,
  // descending, so the biggest debt sits at the bottom of every stack and
  // first in the legend/breakdown. Colors follow the same ranking.
  const { legendItems, colorByLabel, rankByLabel } = useMemo(() => {
    const colorByLabel = new Map<string, string>();
    const rankByLabel = new Map<string, number>();
    if (!data?.dataPoints) return { legendItems: [], colorByLabel, rankByLabel };

    const totalsByLabel = new Map<string, number>();
    for (const point of data.dataPoints) {
      for (const category of point.categories) {
        totalsByLabel.set(category.category, (totalsByLabel.get(category.category) || 0) + category.amount);
      }
    }

    const ordered = Array.from(totalsByLabel.entries())
      .filter(([, amount]) => amount > 0)
      .sort(([, a], [, b]) => b - a);

    ordered.forEach(([label], index) => {
      colorByLabel.set(label, SERIES_PALETTE[index % SERIES_PALETTE.length]);
      rankByLabel.set(label, index);
    });

    return {
      legendItems: ordered.map(([label]) => ({
        category: label,
        color: colorByLabel.get(label) || FALLBACK_SERIES_COLOR,
      })),
      colorByLabel,
      rankByLabel,
    };
  }, [data?.dataPoints]);

  const byRank = useCallback(
    (a: { category: string }, b: { category: string }) =>
      (rankByLabel.get(a.category) ?? Number.MAX_SAFE_INTEGER) -
      (rankByLabel.get(b.category) ?? Number.MAX_SAFE_INTEGER),
    [rankByLabel]
  );

  const { chartData, barWidth, chartSpacing, availableWidth } = useMemo(() => {
    if (!data?.dataPoints || data.dataPoints.length === 0) {
      return { chartData: [], barWidth: 22, chartSpacing: 16, availableWidth: 0 };
    }

    const points = data.dataPoints;
    const totalPoints = points.length;
    const screenWidth = Dimensions.get('window').width;
    const availableWidth = screenWidth - 64 - 40;

    // Split the available width across all months so the chart never
    // overflows, capping bar width and gap so wide screens don't stretch
    // the bars apart.
    const perPoint = availableWidth / totalPoints;
    const barWidth = Math.min(28, Math.max(12, Math.round(perPoint * 0.45)));
    const chartSpacing = Math.min(36, Math.max(10, Math.round(perPoint - barWidth)));

    // Smallest value a segment may render as, derived from the y-axis scale,
    // so no debt collapses below MIN_SEGMENT_PX on screen.
    const yMax = data.yAxisConfig?.maxValue || 1;
    const minSegmentValue = (yMax * MIN_SEGMENT_PX) / CHART_HEIGHT;

    // Each bar's total height stays truthful to the y-axis, but the height is
    // distributed among that month's debts by sqrt(amount) instead of
    // linearly. This compresses a dominant debt (e.g. an amortization) and
    // expands the small ones, so an 8000 debt reads clearly bigger than a 180
    // one. Real amounts still come from the tooltip and breakdown panel.
    const buildStacks = (point: (typeof points)[number], index: number) => {
      const positives = [...point.categories]
        .filter((category) => category.amount > 0)
        .sort(byRank);

      if (positives.length === 0) {
        return [{ value: 0, color: 'transparent' }];
      }

      const total = positives.reduce((sum, category) => sum + category.amount, 0);
      const weights = positives.map((category) => Math.sqrt(category.amount));
      const weightSum = weights.reduce((sum, weight) => sum + weight, 0);

      // Floor can't exceed an even split, or floored segments would overflow
      // the bar's true total.
      const floorValue = Math.min(minSegmentValue, total / positives.length);
      const isFloored = weights.map((weight) => (total * weight) / weightSum < floorValue);
      const flooredSum = isFloored.filter(Boolean).length * floorValue;
      const freeWeightSum = weights.reduce((sum, weight, i) => (isFloored[i] ? sum : sum + weight), 0);

      return positives.map((category, i) => ({
        value: isFloored[i]
          ? floorValue
          : ((total - flooredSum) * weights[i]) / freeWeightSum,
        color: colorByLabel.get(category.category) || FALLBACK_SERIES_COLOR,
        // Tapping a segment selects the month for the breakdown panel and
        // shows a tooltip with just that category's amount (toggles off on
        // a second tap of the same segment).
        onPress: () => {
          setSelectedMonthIndex(index);
          setTappedSegment((prev) =>
            prev && prev.monthIndex === index && prev.category === category.category
              ? null
              : { monthIndex: index, category: category.category, amount: category.amount }
          );
        },
      }));
    };

    return {
      chartData: points.map((point, index) => ({
        label: point.label,
        stacks: buildStacks(point, index),
      })),
      barWidth,
      chartSpacing,
      availableWidth,
    };
  }, [data?.dataPoints, data?.yAxisConfig?.maxValue, colorByLabel, byRank]);

  const selectedPoint =
    selectedMonthIndex !== null ? data?.dataPoints?.[selectedMonthIndex] : undefined;

  const tooltipLeft = useMemo(() => {
    if (!tappedSegment) return 0;
    const anchorX =
      Y_AXIS_LABEL_WIDTH +
      chartSpacing +
      tappedSegment.monthIndex * (barWidth + chartSpacing) +
      barWidth / 2;
    return Math.min(
      Math.max(anchorX - TOOLTIP_WIDTH / 2, 0),
      Math.max(availableWidth - TOOLTIP_WIDTH, 0)
    );
  }, [tappedSegment, barWidth, chartSpacing, availableWidth]);

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
            {MONTHLY_PRESETS.map((option) => (
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

        <Text variant="bodySmall" style={styles.periodLabel}>
          {selectedPreset.label}
        </Text>

        {hasDebt && (
          <View style={styles.totalContainer}>
            <Text variant="headlineLarge" style={styles.totalAmount}>
              {data?.currency || 'PHP'} {formatAmount(data?.totalDebt || 0)}
            </Text>
            <Text variant="bodySmall" style={styles.totalLabel}>
              Total Outstanding Debt
            </Text>
          </View>
        )}

        {hasDebt ? (
          <>
            <View style={styles.chartContainer}>
              <View style={{ width: availableWidth }}>
                <BarChart
                  // Remount on range/profile change: gifted-charts' animated
                  // stacked bars throw when the data length changes in place.
                  key={`${selectedPresetKey}-${delegatedOwner}`}
                  stackData={chartData}
                  width={availableWidth}
                  height={CHART_HEIGHT}
                  barWidth={barWidth}
                  spacing={chartSpacing}
                  initialSpacing={chartSpacing}
                  endSpacing={chartSpacing}
                  yAxisTextStyle={{ color: theme.colors.onSurface, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurface, fontSize: 10 }}
                  yAxisThickness={0}
                  xAxisThickness={0}
                  xAxisColor={theme.colors.outline}
                  maxValue={data?.yAxisConfig?.maxValue}
                  stepValue={data?.yAxisConfig?.interval}
                  barBorderRadius={0}
                  isAnimated
                />
                {tappedSegment && (
                  <View
                    style={[
                      styles.tooltip,
                      { left: tooltipLeft, backgroundColor: theme.colors.inverseSurface },
                    ]}
                    pointerEvents="none"
                  >
                    <Text
                      variant="labelMedium"
                      style={[styles.tooltipText, { color: theme.colors.inverseOnSurface }]}
                    >
                      {toTitleCase(tappedSegment.category)}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[styles.tooltipText, { color: theme.colors.inverseOnSurface }]}
                    >
                      {data?.currency || 'PHP'} {formatAmount(tappedSegment.amount)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <View style={styles.legendContainer}>
              {legendItems.map((item) => (
                <View key={item.category} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                  <Text variant="bodySmall" style={styles.legendLabel}>
                    {toTitleCase(item.category)}
                  </Text>
                </View>
              ))}
            </View>
            {selectedPoint && (
              <View style={styles.breakdownSection}>
                <Text variant="titleSmall" style={styles.breakdownTitle}>
                  {selectedPoint.label}
                </Text>
                <View style={styles.breakdownRow}>
                  <Text variant="titleSmall" style={styles.breakdownCategory}>
                    Total
                  </Text>
                  <Text variant="titleSmall" style={styles.breakdownAmount}>
                    {formatAmount(selectedPoint.totalDebt)}
                  </Text>
                </View>
                <Divider style={styles.breakdownDivider} />
                {[...selectedPoint.categories]
                  .filter((category) => category.amount > 0)
                  .sort(byRank)
                  .map((category) => (
                    <View
                      key={category.category}
                      style={[
                        styles.breakdownRow,
                        styles.breakdownNoteRow,
                        { borderBottomColor: theme.colors.outlineVariant },
                      ]}
                    >
                      <View style={styles.breakdownNoteInfo}>
                        <View
                          style={[
                            styles.legendDot,
                            { backgroundColor: colorByLabel.get(category.category) || FALLBACK_SERIES_COLOR },
                          ]}
                        />
                        <Text variant="bodyMedium" style={styles.breakdownNoteLabel} numberOfLines={1}>
                          {toTitleCase(category.category)}
                        </Text>
                        <View
                          style={[
                            styles.categoryChip,
                            { backgroundColor: theme.colors.secondaryContainer },
                          ]}
                        >
                          <Text
                            variant="labelSmall"
                            style={[styles.categoryChipText, { color: theme.colors.onSecondaryContainer }]}
                            numberOfLines={1}
                          >
                            {toTitleCase(category.originalCategory)}
                          </Text>
                        </View>
                      </View>
                      <Text variant="bodyMedium" style={styles.breakdownAmount}>
                        {formatAmount(category.amount)}
                      </Text>
                    </View>
                  ))}
              </View>
            )}
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
  tooltip: {
    position: 'absolute',
    top: 0,
    width: TOOLTIP_WIDTH,
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: customTheme.roundness,
  },
  tooltipText: {
    textAlign: 'center',
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
  breakdownSection: {
    marginTop: spacing.md,
    backgroundColor: customTheme.colors.surfaceVariant,
    borderRadius: customTheme.roundness,
    padding: spacing.md,
  },
  breakdownTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownNoteRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: spacing.sm,
  },
  breakdownCategory: {
    flex: 1,
  },
  breakdownNoteInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
    marginRight: spacing.sm,
  },
  breakdownNoteLabel: {
    flexShrink: 1,
    marginRight: spacing.xs,
  },
  categoryChip: {
    borderRadius: 999,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    flexShrink: 0,
  },
  categoryChipText: {
    fontSize: 11,
  },
  breakdownAmount: {
    fontWeight: '600',
  },
  breakdownDivider: {
    marginVertical: spacing.xs,
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
