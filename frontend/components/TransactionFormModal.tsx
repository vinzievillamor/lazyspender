import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { TransactionType } from '../types/transaction';
import { CreateTransactionRequest } from '../services/transaction.service';
import { useCreateTransaction } from '../hooks/useTransactions';
import { useUser } from '../contexts/UserContext';

interface TransactionFormModalProps {
  visible: boolean;
  onClose: () => void;
}

const TransactionFormModal: React.FC<TransactionFormModalProps> = ({ visible, onClose }) => {
  const { user } = useUser();
  const { mutate: createTransaction, isPending } = useCreateTransaction();

  const [formData, setFormData] = useState<Partial<CreateTransactionRequest>>({
    type: TransactionType.EXPENSE,
    currency: 'USD',
    date: new Date().toISOString(),
  });

  const handleSubmit = () => {
    if (!user) {
      Alert.alert('Error', 'User data not available');
      return;
    }

    if (!formData.account || !formData.category || !formData.amount || !formData.refCurrencyAmount) {
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
      currency: formData.currency || 'USD',
      refCurrencyAmount: formData.refCurrencyAmount,
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
    setFormData({
      type: TransactionType.EXPENSE,
      currency: 'USD',
      date: new Date().toISOString(),
    });
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={handleClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>New Transaction</Text>
            <TouchableOpacity onPress={handleClose} disabled={isPending}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === TransactionType.EXPENSE && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type: TransactionType.EXPENSE })}
                  disabled={isPending}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === TransactionType.EXPENSE && styles.typeButtonTextActive,
                    ]}
                  >
                    Expense
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    formData.type === TransactionType.INCOME && styles.typeButtonActive,
                  ]}
                  onPress={() => setFormData({ ...formData, type: TransactionType.INCOME })}
                  disabled={isPending}
                >
                  <Text
                    style={[
                      styles.typeButtonText,
                      formData.type === TransactionType.INCOME && styles.typeButtonTextActive,
                    ]}
                  >
                    Income
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Account *</Text>
              <View style={styles.accountSelector}>
                {user?.accounts.map((account) => (
                  <TouchableOpacity
                    key={account}
                    style={[
                      styles.accountButton,
                      formData.account === account && styles.accountButtonActive,
                    ]}
                    onPress={() => setFormData({ ...formData, account })}
                    disabled={isPending}
                  >
                    <Text
                      style={[
                        styles.accountButtonText,
                        formData.account === account && styles.accountButtonTextActive,
                      ]}
                    >
                      {account}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              <TextInput
                style={styles.input}
                value={formData.category}
                onChangeText={(text) => setFormData({ ...formData, category: text })}
                placeholder="Enter category"
                editable={!isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Amount *</Text>
              <TextInput
                style={styles.input}
                value={formData.amount?.toString()}
                onChangeText={(text) => setFormData({ ...formData, amount: parseFloat(text) || 0 })}
                placeholder="0.00"
                keyboardType="numeric"
                editable={!isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Reference Currency Amount *</Text>
              <TextInput
                style={styles.input}
                value={formData.refCurrencyAmount?.toString()}
                onChangeText={(text) =>
                  setFormData({ ...formData, refCurrencyAmount: parseFloat(text) || 0 })
                }
                placeholder="0.00"
                keyboardType="numeric"
                editable={!isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Currency</Text>
              <TextInput
                style={styles.input}
                value={formData.currency}
                onChangeText={(text) => setFormData({ ...formData, currency: text })}
                placeholder="USD"
                editable={!isPending}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Note</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.note}
                onChangeText={(text) => setFormData({ ...formData, note: text })}
                placeholder="Add a note"
                multiline
                numberOfLines={3}
                editable={!isPending}
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={isPending}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.submitButton, isPending && styles.disabledButton]}
              onPress={handleSubmit}
              disabled={isPending}
            >
              {isPending ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.submitButtonText}>Create</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Roboto-Bold',
    color: '#111827',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
    fontFamily: 'Roboto-Regular',
  },
  form: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontFamily: 'Roboto-Regular',
    color: '#111827',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  accountSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
  },
  accountButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  accountButtonText: {
    fontSize: 14,
    fontFamily: 'Roboto-Medium',
    color: '#6b7280',
  },
  accountButtonTextActive: {
    color: '#ffffff',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f3f4f6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#374151',
  },
  submitButton: {
    backgroundColor: '#007AFF',
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Roboto-Medium',
    color: '#ffffff',
  },
  disabledButton: {
    opacity: 0.6,
  },
});

export default TransactionFormModal;
