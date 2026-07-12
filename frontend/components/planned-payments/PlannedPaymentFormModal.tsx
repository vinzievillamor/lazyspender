import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Checkbox, Chip, Divider, IconButton, SegmentedButtons, Surface, Text, TextInput, useTheme } from 'react-native-paper';
import { shadows, spacing } from '../../config/theme';
import { useUser } from '../../contexts/UserContext';
import { useCreatePlannedPayment, useUpdatePlannedPayment } from '../../hooks/usePlannedPayments';
import { useDistinctNotes } from '../../hooks/useTransactions';
import { Category } from '../../types/category';
import { ConfirmationType, CreatePlannedPaymentRequest, EndType, PlannedPayment, RecurrenceType } from '../../types/plannedPayment';
import { getCategoryIcon } from '../../utils/categoryIcons';
import AutocompleteInputText from '../AutocompleteInputText';
import CategorySelectorModal from '../CategorySelectorModal';

interface PlannedPaymentFormModalProps {
  visible: boolean;
  onClose: () => void;
  initialData?: PlannedPayment;
}

const PlannedPaymentFormModal: React.FC<PlannedPaymentFormModalProps> = ({ visible, onClose, initialData }) => {
  const { user } = useUser();
  const theme = useTheme();
  const { mutate: createPlannedPayment, isPending: isCreating } = useCreatePlannedPayment();
  const { mutate: updatePlannedPayment, isPending: isUpdating } = useUpdatePlannedPayment();
  const { data: distinctNotes } = useDistinctNotes(user!.owner);

  const isPending = isCreating || isUpdating;
  const isEditMode = !!initialData;
  const hasAccounts = !!user?.accounts?.length;

  const getInitialFormData = (): Partial<CreatePlannedPaymentRequest> => {
    if (initialData) {
      return {
        account: initialData.account,
        category: initialData.category,
        amount: Math.abs(initialData.amount),
        note: initialData.note,
        startDate: initialData.startDate,
        recurrenceType: initialData.recurrenceType,
        recurrenceValue: initialData.recurrenceValue,
        endType: initialData.endType,
        endValue: initialData.endValue,
        confirmationType: initialData.confirmationType,
      };
    }
    return {
      account: user?.accounts?.[0],
      startDate: new Date().toISOString(),
      recurrenceType: RecurrenceType.MONTHLY,
      recurrenceValue: new Date().getDate().toString(),
      endType: EndType.NEVER,
      confirmationType: ConfirmationType.MANUAL,
    };
  };

  const [formData, setFormData] = useState<Partial<CreatePlannedPaymentRequest>>(getInitialFormData());
  const [categorySelectorVisible, setCategorySelectorVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [isExpense, setIsExpense] = useState(initialData ? initialData.amount < 0 : true);

  const getSelectedDate = () => {
    return formData.startDate ? new Date(formData.startDate) : new Date();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (event.type === 'dismissed') {
      setDatePickerVisible(false);
      return;
    }

    if (!selectedDate) return;

    setFormData({
      ...formData,
      startDate: selectedDate.toISOString(),
      recurrenceValue: selectedDate.getDate().toString()
    });
    setDatePickerVisible(false);
  };

  const handleSubmit = () => {
    if (!user) {
      Alert.alert('Error', 'User data not available');
      return;
    }

    if (!hasAccounts) {
      Alert.alert('No Accounts', 'Add an account to your profile before creating a planned payment');
      return;
    }

    if (!formData.account || !formData.category || !formData.amount) {
      Alert.alert('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (formData.endType === EndType.OCCURRENCE && !formData.endValue) {
      Alert.alert('Validation Error', 'Please enter number of occurrences');
      return;
    }

    const request: CreatePlannedPaymentRequest = {
      owner: user.owner,
      account: formData.account,
      category: formData.category,
      amount: formData.amount,
      note: formData.note,
      startDate: formData.startDate || new Date().toISOString(),
      recurrenceType: RecurrenceType.MONTHLY,
      recurrenceValue: formData.recurrenceValue || new Date().getDate().toString(),
      endType: formData.endType || EndType.NEVER,
      endValue: formData.endType === EndType.OCCURRENCE ? formData.endValue : undefined,
      confirmationType: formData.confirmationType || ConfirmationType.MANUAL,
    };

    if (isEditMode && initialData) {
      updatePlannedPayment({ id: initialData.id, request }, {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to update planned payment');
        },
      });
    } else {
      createPlannedPayment(request, {
        onSuccess: () => {
          resetForm();
          onClose();
        },
        onError: (error) => {
          Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create planned payment');
        },
      });
    }
  };

  const resetForm = () => {
    setFormData(getInitialFormData());
    setIsExpense(true);
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
                  <Text variant="titleLarge">{isEditMode ? 'Update Planned Payment' : 'New Planned Payment'}</Text>
                  <IconButton icon="close" onPress={handleClose} disabled={isPending} />
                </View>

                <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
                  <View style={styles.inputGroup}>
                    <SegmentedButtons
                      value={isExpense ? 'expense' : 'income'}
                      onValueChange={(value) => setIsExpense(value === 'expense')}
                      buttons={[
                        {
                          value: 'expense',
                          label: 'Expense',
                          icon: 'arrow-down',
                          disabled: isPending,
                          showSelectedCheck: true,
                        },
                        {
                          value: 'income',
                          label: 'Income',
                          icon: 'arrow-up',
                          disabled: isPending,
                          showSelectedCheck: true,
                        },
                      ]}
                      style={styles.segmentedButtons}
                      theme={{
                        colors: {
                          secondaryContainer: isExpense ? '#FFEBEE' : '#E8F5E9',
                          onSecondaryContainer: isExpense ? '#C62828' : '#2E7D32',
                          outline: 'transparent',
                        }
                      }}
                    />
                  </View>

                  <Divider />

                  <View style={{ ...styles.inputGroup, marginTop: spacing.lg }}>
                    {!hasAccounts && (
                      <Text variant="bodyMedium" style={{ color: theme.colors.error, marginBottom: spacing.sm }}>
                        Add an account to your profile before creating a planned payment
                      </Text>
                    )}
                    <View style={styles.chipContainer}>
                      {(user?.accounts ?? []).map((account) => (
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
                    <AutocompleteInputText
                      label="Note"
                      value={formData.note || ''}
                      onChangeText={(text) => setFormData({ ...formData, note: text })}
                      placeholder="Add a note"
                      disabled={isPending}
                      suggestions={distinctNotes?.filter(text => text && text.length > 0)}
                    />
                  </View>

                  <Divider style={{ marginVertical: spacing.md }} />

                  <View style={styles.inputGroup}>
                    <Text variant="labelLarge" style={styles.sectionTitle}>Recurrence Settings</Text>

                    <Button
                      mode="outlined"
                      onPress={() => setDatePickerVisible(true)}
                      disabled={isPending}
                      icon="calendar"
                      contentStyle={styles.dateTimeButtonContent}
                      style={styles.dateButton}
                      theme={{
                        colors: {
                          outline: 'transparent',
                        }
                      }}
                    >
                      Start: {formatDate(getSelectedDate())}
                    </Button>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text variant="labelMedium" style={{ marginBottom: spacing.sm, color: theme.colors.onSurfaceVariant }}>
                      Repeats monthly on day {formData.recurrenceValue}
                    </Text>
                  </View>

                  <View style={styles.inputGroup}>
                    <SegmentedButtons
                      value={formData.endType || EndType.NEVER}
                      onValueChange={(value) => setFormData({ ...formData, endType: value as EndType })}
                      buttons={[
                        {
                          value: EndType.NEVER,
                          label: 'Indefinitely',
                          disabled: isPending,
                          showSelectedCheck: true,
                        },
                        {
                          value: EndType.OCCURRENCE,
                          label: 'N times',
                          disabled: isPending,
                          showSelectedCheck: true,
                        },
                      ]}
                      style={styles.segmentedButtons}
                    />
                  </View>

                  {formData.endType === EndType.OCCURRENCE && (
                    <View style={styles.inputGroup}>
                      <TextInput
                        label="Number of occurrences *"
                        value={formData.endValue || ''}
                        onChangeText={(text) => setFormData({ ...formData, endValue: text })}
                        placeholder=""
                        keyboardType="numeric"
                        disabled={isPending}
                        mode="flat"
                        style={styles.input}
                        underlineStyle={{ display: 'none' }}
                      />
                    </View>
                  )}

                  <View style={styles.checkboxContainer}>
                    <Checkbox
                      status={formData.confirmationType === ConfirmationType.AUTO ? 'checked' : 'unchecked'}
                      onPress={() => setFormData({
                        ...formData,
                        confirmationType: formData.confirmationType === ConfirmationType.AUTO
                          ? ConfirmationType.MANUAL
                          : ConfirmationType.AUTO
                      })}
                      disabled={isPending}
                    />
                    <Text
                      variant="bodyMedium"
                      style={{ flex: 1, color: theme.colors.onSurface }}
                      onPress={() => setFormData({
                        ...formData,
                        confirmationType: formData.confirmationType === ConfirmationType.AUTO
                          ? ConfirmationType.MANUAL
                          : ConfirmationType.AUTO
                      })}
                    >
                      Auto-confirm on due date
                    </Text>
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
                    disabled={isPending || !hasAccounts}
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

      {datePickerVisible && (
        <DateTimePicker
          value={getSelectedDate()}
          mode="date"
          display="default"
          onChange={handleDateChange}
          themeVariant="light"
          accentColor={theme.colors.primary}
        />
      )}
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
    height: '85%',
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
  sectionTitle: {
    marginBottom: spacing.md,
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
    borderRadius: 12
  },
  input: {
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    ...shadows.sm,
  },
  categoryChip: {
    borderRadius: 12,
    minHeight: 56,
    justifyContent: 'center',
    backgroundColor: '#F8F9FA',
    ...shadows.sm,
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
  dateButton: {
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: '#F8F9FA',
    ...shadows.sm,
  },
  dateTimeButtonContent: {
    justifyContent: 'center',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
});

export default PlannedPaymentFormModal;
