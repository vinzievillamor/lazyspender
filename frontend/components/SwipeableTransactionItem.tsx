import { useRef } from "react";
import { StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import { IconButton, List, Surface, Text, useTheme } from "react-native-paper";
import Reanimated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { shadows, spacing } from "../config/theme";
import { Transaction, TransactionType } from "../types/transaction";
import { getCategoryIcon } from "../utils/categoryIcons";

interface TransactionItemProps {
  transaction: Transaction;
  onPress: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
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

export default function SwipeableTransactionItem({ transaction, onPress, onDelete }: TransactionItemProps) {
  const theme = useTheme();
  const isIncome = transaction.type === TransactionType.INCOME;
  const swipeableRef = useRef<any>(null);
  const height = useSharedValue(80); // approximate height of transaction item
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    height: height.value,
    opacity: opacity.value,
  }));

  const handleOnPress = () => {
    onPress(transaction);
  }

  const handleOnDelete = (transactionId: string) => {
    // Animate out the item
    height.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(0, { duration: 200 });

    // Trigger the actual deletion after a short delay to allow animation to start
    setTimeout(() => {
      onDelete(transactionId);
    }, 50);
  }

  const singleTapGesture = () => {
    return Gesture.Tap()
      .maxDuration(250)
      .maxDistance(10)
      .numberOfTaps(1)
      .onEnd(handleOnPress)
      .runOnJS(true);
  }

  return (
    <Reanimated.View style={animatedStyle}>
      <ReanimatedSwipeable
        ref={swipeableRef}
        renderRightActions={RightAction}
        onEnded={() => console.log('onEnded')}
        onFailed={() => console.log('onFailed')}
        onActivated={() => console.log('onActivated')}
        onSwipeableClose={() => console.log('onSwipeableClose')}
        onSwipeableOpen={() => handleOnDelete(transaction.id)}
        onBegan={() => console.log('onBegan')}>
        <GestureDetector gesture={singleTapGesture()}>
          <Surface style={styles.surface} elevation={1}>
            <List.Item
              title={transaction.category}
              description={transaction.note}
              descriptionStyle={{ color: theme.colors.onSurfaceVariant }}
              left={() => (
                <View style={styles.iconContainer}>
                  {getCategoryIcon(transaction.category)}
                </View>
              )}
              right={() => (
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.amountText,
                    { color: isIncome ? theme.colors.tertiary : theme.colors.error }
                  ]}
                >
                  {isIncome ? '+' : '-'}{transaction.amount.toFixed(2)}
                </Text>
              )}
              style={styles.listItem}
              rippleColor="rgba(0, 0, 0, 0.1)"
            />
          </Surface>
        </GestureDetector>
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
  listItem: {
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: spacing.lg,
    marginRight: spacing.sm,
  },
  amountText: {
    alignSelf: "center",
    marginRight: spacing.lg
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
