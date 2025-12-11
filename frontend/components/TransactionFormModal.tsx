import React, { useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Chip, IconButton, SegmentedButtons, Surface, Text, TextInput } from 'react-native-paper';
import { useUser } from '../contexts/UserContext';
import { useCreateTransaction } from '../hooks/useTransactions';
import { CreateTransactionRequest } from '../services/transaction.service';
import { Category } from '../types/category';
import { TransactionType } from '../types/transaction';
import CategorySelectorModal from './CategorySelectorModal';

interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ visible, onClose }) => {
  const { user } = useUser();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const getInitialFormData = (): Partial<CreateTransactionRequest> => ({
    type: TransactionType.EXPENSE,
    currency: 'USD',
    category: Category.ACTIVE_SPORT_FITNESS,
    account: user?.accounts[0],
    date: new Date().toISOString(),
  });

  const [formData, setFormData] = useState<Partial<CreateTransactionRequest>>(getInitialFormData());
  const [categorySelectorVisible, setCategorySelectorVisible] = useState(false);

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

    createTransaction(request, {
      onSuccess: () => {
        Alert.alert('Success', 'Transaction created successfully');
        resetForm();
        onClose();
      },
      onError: (error) => {
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create transaction');
      },
    });
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
            <View style={styles.header}>
              <Text variant="headlineSmall">New Transaction</Text>
              <IconButton icon="close" onPress={handleClose} disabled={isPending} />
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text variant="labelLarge" style={styles.label}>Type *</Text>
                <SegmentedButtons
                  value={formData.type || TransactionType.EXPENSE}
                  onValueChange={(value) => setFormData({ ...formData, type: value as TransactionType })}
                  buttons={[
                    { value: TransactionType.EXPENSE, label: 'Expense', disabled: isPending},
                    { value: TransactionType.INCOME, label: 'Income', disabled: isPending },
                  ]}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelLarge" style={styles.label}>Account *</Text>
                <View style={styles.chipContainer}>
                  {user?.accounts.map((account) => (
                    <Chip
                      key={account}
                      selected={formData.account === account}
                      onPress={() => setFormData({ ...formData, account })}
                      disabled={isPending}
                      style={styles.chip}
                    >
                      {account}
                    </Chip>
                  ))}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text variant="labelLarge" style={styles.label}>Category *</Text>
                <Button
                  mode="outlined"
                  onPress={() => setCategorySelectorVisible(true)}
                  disabled={isPending}
                  icon="chevron-down"
                  contentStyle={styles.categoryButtonContent}
                  style={styles.categoryButton}
                >
                  {formData.category || 'Select a category'}
                </Button>
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  label="Amount *"
                  value={formData.amount?.toString()}
                  onChangeText={(text) => setFormData({ ...formData, amount: parseFloat(text) || 0 })}
                  placeholder="0.00"
                  keyboardType="numeric"
                  disabled={isPending}
                  mode="outlined"
                />
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  label="Currency"
                  value={formData.currency}
                  onChangeText={(text) => setFormData({ ...formData, currency: text })}
                  placeholder="USD"
                  disabled={isPending}
                  mode="outlined"
                />
              </View>

              <View style={styles.inputGroup}>
                <TextInput
                  label="Note"
                  value={formData.note}
                  onChangeText={(text) => setFormData({ ...formData, note: text })}
                  placeholder="Add a note"
                  multiline
                  numberOfLines={3}
                  disabled={isPending}
                  mode="outlined"
                />
              </View>
            </ScrollView>

            <View style={styles.footer}>
              <Button
                mode="outlined"
                onPress={handleClose}
                disabled={isPending}
                style={styles.button}
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
                Create
              </Button>
            </View>
          </Surface>
        </View>
      </Modal>

      <CategorySelectorModal
        visible={categorySelectorVisible}
        selectedCategory={formData.category as Category}
        onSelect={(category) => setFormData({ ...formData, category })}
        onClose={() => setCategorySelectorVisible(false)}
      />
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    height: '75%',
    width: '100%',
    maxWidth: 500,
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: 20,
    paddingRight: 8,
    paddingVertical: 12,
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    marginBottom: 8,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    marginRight: 4,
    marginBottom: 4,
  },
  categoryButton: {
    justifyContent: 'flex-start',
  },
  categoryButtonContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
  },
});

export default TransactionFormModal;
