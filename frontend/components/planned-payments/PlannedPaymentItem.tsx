import { useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Button, IconButton, List, Surface, Text, useTheme } from "react-native-paper";
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { shadows, spacing } from "../../config/theme";
import { ConfirmationType, EndType, PaymentStatus, PlannedPayment } from "../../types/plannedPayment";
import { getCategoryIcon } from "../../utils/categoryIcons";

interface PlannedPaymentItemProps {
  plannedPayment: PlannedPayment;
  onPress: (payment: PlannedPayment) => void;
  onConfirm: (paymentId: string) => Promise<void>;
  onDelete: (paymentId: string) => void;
  completedCount: number;
}

const RightAction = () => {
  const theme = useTheme();

  return (
    <Reanimated.View style={[styles.deleteAction, { backgroundColor: theme.colors.error }]}>
      <IconButton
        icon="delete-outline"
        iconColor={theme.colors.onError}
        size={24}
      />
    </Reanimated.View>
  );
}

const formatDueDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (date.toDateString() === today.toDateString()) {
    return 'Due today';
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return 'Due tomorrow';
  } else {
    return `Due ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
  }
};

export default function PlannedPaymentItem({
  plannedPayment,
  onPress,
  onConfirm,
  onDelete,
  completedCount
}: PlannedPaymentItemProps) {

  const theme = useTheme();
  const isExpense = true // TODO: support planned payment as income
  const swipeableRef = useRef<any>(null);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const [isConfirming, setIsConfirming] = useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handleOnPress = () => {
    onPress(plannedPayment);
  }

  const handleOnDelete = (paymentId: string) => {
    scale.value = withTiming(0, { duration: 200 });
    opacity.value = withTiming(0, { duration: 200 });

    setTimeout(() => {
      onDelete(paymentId);
    }, 200);
  }

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(plannedPayment.id);
    } finally {
      setIsConfirming(false);
    }
  }

  const singleTapGesture = () => {
    return Gesture.Tap()
      .maxDuration(250)
      .maxDistance(10)
      .numberOfTaps(1)
      .onEnd(handleOnPress)
      .runOnJS(true);
  }

  const getProgressText = () => {
    if (plannedPayment.endType === EndType.NEVER) {
      return `${completedCount} completed`;
    }
    const total = parseInt(plannedPayment.endValue || '0', 10);
    return `${completedCount}/${total}`;
  };

  const isDueToday = new Date(plannedPayment.nextDueDate) <= new Date();
  const showConfirmButton = plannedPayment.confirmationType === ConfirmationType.MANUAL &&
    plannedPayment.status === PaymentStatus.ACTIVE &&
    isDueToday;

  return (
    <Reanimated.View style={animatedStyle}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={RightAction}
        onSwipeableOpen={() => handleOnDelete(plannedPayment.id)}>
        <Surface style={styles.surface} elevation={1}>
          <View style={styles.container}>
            <GestureDetector gesture={singleTapGesture()}>
              <View style={styles.mainContent}>
                <List.Item
                  title={plannedPayment.category}
                  description={() => (
                    <View style={styles.descriptionContainer}>
                      {plannedPayment.note ? (
                        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                          {plannedPayment.note}
                        </Text>
                      ) : null}
                      <View style={styles.metaRow}>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                          {formatDueDate(plannedPayment.nextDueDate)}
                        </Text>
                        <Text variant="labelSmall" style={styles.separator}>•</Text>
                        <Text variant="labelSmall" style={{ color: theme.colors.outline }}>
                          {getProgressText()}
                        </Text>
                      </View>
                    </View>
                  )}
                  left={() => (
                    <View style={styles.iconContainer}>
                      {getCategoryIcon(plannedPayment.category)}
                    </View>
                  )}
                  right={() => (
                    <View style={styles.rightContainer}>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.amountText,
                          { color: isExpense ? theme.colors.error : theme.colors.tertiary }
                        ]}
                      >
                        {isExpense ? '-' : '+'}{Math.abs(plannedPayment.amount).toFixed(2)}
                      </Text>
                    </View>
                  )}
                  style={styles.listItem}
                  rippleColor="rgba(0, 0, 0, 0.1)"
                />
              </View>
            </GestureDetector>
            {showConfirmButton && (
              <View style={styles.confirmButtonContainer}>
                <Button
                  mode="contained"
                  compact
                  onPress={handleConfirm}
                  loading={isConfirming}
                  disabled={isConfirming}
                  style={styles.confirmButton}
                >
                  Confirm
                </Button>
              </View>
            )}
          </View>
        </Surface>
      </ReanimatedSwipeable>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  surface: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.xs,
    borderRadius: 16,
    ...shadows.sm,
    overflow: 'hidden',
  },
  container: {
    flexDirection: 'column',
  },
  mainContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listItem: {
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  rightContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginRight: spacing.lg,
  },
  amountText: {
    fontWeight: '600',
  },
  descriptionContainer: {
    marginTop: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  separator: {
    marginHorizontal: spacing.xs,
    color: '#999',
  },
  confirmButtonContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  confirmButton: {
    borderRadius: 8,
  },
  deleteAction: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    flex: 1,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.lg,
    borderRadius: 16,
    paddingRight: spacing.md,
  },
});
