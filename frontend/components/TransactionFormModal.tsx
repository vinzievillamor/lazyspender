import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Chip, Divider, IconButton, SegmentedButtons, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { DatePickerModal, TimePickerModal } from 'react-native-paper-dates';
import { shadows, spacing } from '../config/theme';
import { useUser } from '../contexts/UserContext';
import { useCreateTransaction, useDistinctNotes, useUpdateTransaction } from '../hooks/useTransactions';
import { CreateTransactionRequest } from '../services/transaction.service';
import { Category } from '../types/category';
import { TransactionType } from '../types/transaction';
import { getCategoryIcon } from '../utils/categoryIcons';
import AutocompleteInputText from './AutocompleteInputText';
import CategorySelectorModal from './CategorySelectorModal';

interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialData: CreateTransactionRequest | undefined
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ visible, onClose, initialData }) => {
  const { user } = useUser();
  const theme = useTheme();
  const { mutate: createTransaction, isPending: isCreating } = useCreateTransaction();
  const { mutate: updateTransaction, isPending: isUpdating } = useUpdateTransaction();
  const { data: distinctNotes } = useDistinctNotes(user!.owner);

  const isPending = isCreating || isUpdating;
  const isEditMode = !!initialData?.id;

  const getInitialFormData = (): Partial<CreateTransactionRequest> => {
    return initialData ?? ({
      type: TransactionType.EXPENSE,
      account: user?.accounts[0],
      date: new Date().toISOString(),
    });
  };

  const [formData, setFormData] = useState<Partial<CreateTransactionRequest>>(getInitialFormData());
  const [categorySelectorVisible, setCategorySelectorVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [timePickerVisible, setTimePickerVisible] = useState(false);

  const getSelectedDate = () => {
    return formData.date ? new Date(formData.date) : new Date();
  };

  const getSelectedTime = () => {
    const date = getSelectedDate();
    return { hours: date.getHours(), minutes: date.getMinutes() };
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDateConfirm = (params: { date?: Date | undefined }) => {
    if (!params.date) return;

    const currentDate = getSelectedDate();
    const newDate = new Date(params.date);
    newDate.setHours(currentDate.getHours());
    newDate.setMinutes(currentDate.getMinutes());
    newDate.setSeconds(currentDate.getSeconds());
    newDate.setMilliseconds(currentDate.getMilliseconds());

    setFormData({ ...formData, date: newDate.toISOString() });
    setDatePickerVisible(false);
  };

  const handleTimeConfirm = ({ hours, minutes }: { hours: number; minutes: number }) => {
    const currentDate = getSelectedDate();
    currentDate.setHours(hours);
    currentDate.setMinutes(minutes);

    setFormData({ ...formData, date: currentDate.toISOString() });
    setTimePickerVisible(false);
  };

  const handleSubmit = () => {
    if (!user) {
      Alert.alert('Error', 'User data not available');
      return;
    }

    if (!formData.account || !formData.category || !formData.amount) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    const request: CreateTransactionRequest = {
      owner: user.owner,
      account: formData.account,
      category: formData.category,
      amount: formData.amount,
      note: formData.note,
      date: formData.date || new Date().toISOString(),
      currency: formData.currency || '',
      refCurrencyAmount: formData.refCurrencyAmount || 0,
      plannedPaymentId: formData.plannedPaymentId,
      type: formData.type || TransactionType.EXPENSE,
    };

    if (isEditMode) {
      updateTransaction({ id: initialData!.id!, request }, {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update transaction');
        },
      });
    } else {
      createTransaction(request, {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create transaction');
        },
      });
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
        <View style={styles.modalOverlay}>
          <Surface style={styles.modalContent}>

            {categorySelectorVisible ? (
              <CategorySelectorModal
                selectedCategory={formData.category as Category}
                onSelect={(category) => setFormData({ ...formData, category })}
                onClose={() => setCategorySelectorVisible(false)}
              />
            ) : (
              <>
                <View style={styles.header}>
                  <Text variant="titleLarge">{isEditMode ? 'Update Transaction' : 'New Transaction'}</Text>
                  <IconButton icon="close" onPress={handleClose} disabled={isPending} />
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <SegmentedButtons
                      value={formData.type || TransactionType.EXPENSE}
                      onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
                      buttons={[
                        { value: TransactionType.EXPENSE, label: 'Expense', disabled: isPending },
                        { value: TransactionType.INCOME, label: 'Income', disabled: isPending },
                      ]}
                      style={styles.segmentedButtons}
                      theme={{
                        colors: {
                          secondaryContainer: theme.colors.primaryContainer,
                          onSecondaryContainer: theme.colors.primary,
                          outline: 'transparent',
                        }
                      }}
                    />
                  </View>

                  <Divider />

                  <View style={{ ...styles.inputGroup, marginTop: spacing.lg }}>
                    <View style={styles.chipContainer}>
                      {user?.accounts.map((account) => (
                        <Chip
                          key={account}
                          selected={formData.account === account}
                          onPress={() => setFormData({ ...formData, account })}
                          disabled={isPending}
                          style={[
                            styles.chip,
                            formData.account === account && {
                              backgroundColor: theme.colors.primaryContainer,
                            }
                          ]}
                          textStyle={{
                            color: formData.account === account ? theme.colors.primary : theme.colors.onSurfaceVariant
                          }}
                          theme={{
                            colors: {
                              outline: 'transparent',
                            }
                          }}
                        >
                          {account}
                        </Chip>
                      ))}
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Chip
                      onPress={() => setCategorySelectorVisible(true)}
                      disabled={isPending}
                      icon={formData.category ? () => getCategoryIcon(formData.category as Category, 18) : 'chevron-down'}
                      style={styles.categoryChip}
                      textStyle={styles.categoryChipText}
                      theme={{
                        colors: {
                          outline: 'transparent',
                        }
                      }}
                    >
                      {formData.category || 'Select a category'}
                    </Chip>
                  </View>

                  <View style={styles.inputGroup}>
                    <TextInput
                      label="Amount *"
                      value={formData.amount?.toString() || ''}
                      onChangeText={(text) => setFormData({ ...formData, amount: parseFloat(text) || 0 })}
                      placeholder="0.00"
                      keyboardType="numeric"
                      disabled={isPending}
                      mode="flat"
                      style={styles.input}
                      underlineStyle={{ display: 'none' }}
                      theme={{
                        colors: {
                          primary: theme.colors.primary,
                          onSurfaceVariant: theme.colors.onSurfaceVariant,
                        }
                      }}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <View style={styles.dateTimeContainer}>
                      <Button
                        mode="outlined"
                        onPress={() => setDatePickerVisible(true)}
                        disabled={isPending}
                        icon="calendar"
                        contentStyle={styles.dateTimeButtonContent}
                        style={[styles.dateTimeButton, { flex: 1.5 }]}
                      >
                        {formatDate(getSelectedDate())}
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={() => setTimePickerVisible(true)}
                        disabled={isPending}
                        icon="clock-outline"
                        contentStyle={styles.dateTimeButtonContent}
                        style={[styles.dateTimeButton, { flex: 1 }]}
                      >
                        {formatTime(getSelectedDate())}
                      </Button>
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <AutocompleteInputText
                      label="Note"
                      value={formData.note || ''}
                      onChangeText={(text) => setFormData({ ...formData, note: text })}
                      placeholder="Add a note"
                      disabled={isPending}
                      suggestions={distinctNotes?.filter(text => text && text.length > 0)}
                    />
                  </View>
                </ScrollView>

                <View style={styles.footer}>
                  <Button
                    mode="outlined"
                    onPress={handleClose}
                    disabled={isPending}
                    style={styles.button}
                    theme={{
                      colors: {
                        outline: 'transparent',
                      }
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSubmit}
                    disabled={isPending}
                    loading={isPending}
                    style={styles.button}
                  >
                    {isEditMode ? 'Update' : 'Create'}
                  </Button>
                </View>
              </>
            )}
          </Surface>
        </View>
      </Modal>



      <DatePickerModal
        locale="en"
        mode="single"
        visible={datePickerVisible}
        onDismiss={() => setDatePickerVisible(false)}
        date={getSelectedDate()}
        onConfirm={handleDateConfirm}
      />

      <TimePickerModal
        locale="en"
        visible={timePickerVisible}
        onDismiss={() => setTimePickerVisible(false)}
        onConfirm={handleTimeConfirm}
        hours={getSelectedTime().hours}
        minutes={getSelectedTime().minutes}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '75%',
    width: '100%',
    maxWidth: 500,
    borderRadius: 24,
    overflow: 'hidden',
    ...shadows.xl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: spacing.xl,
    paddingRight: spacing.sm,
    paddingVertical: spacing.md,
  },
  form: {
    padding: spacing.xl,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    marginBottom: spacing.sm,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    marginRight: 0,
    marginBottom: 0,
    borderRadius: 12,
    ...shadows.sm,
  },
  segmentedButtons: {
    borderRadius: 12,
    ...shadows.sm,
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    ...shadows.sm,
  },
  categoryChip: {
    borderRadius: 12,
    ...shadows.md,
  },
  categoryChipText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    padding: spacing.xl,
    gap: spacing.md,
  },
  button: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 0,
    ...shadows.sm,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dateTimeButton: {
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0,
    ...shadows.md,
  },
  dateTimeButtonContent: {
    justifyContent: 'center',
  },
});

export default TransactionFormModal;
