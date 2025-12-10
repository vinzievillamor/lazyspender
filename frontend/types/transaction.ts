export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export interface Transaction {
  id: string;
  owner: string;
  account: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  currency: string;
  refCurrencyAmount: number;
  plannedPaymentId: string;
  type: TransactionType;
}
