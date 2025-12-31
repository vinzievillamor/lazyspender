export enum RecurrenceType {
  MONTHLY = 'MONTHLY'
}

export enum EndType {
  OCCURRENCE = 'OCCURRENCE',
  NEVER = 'NEVER'
}

export enum ConfirmationType {
  AUTO = 'AUTO',
  MANUAL = 'MANUAL'
}

export enum PaymentStatus {
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export interface PlannedPayment {
  id: string;
  owner: string;
  account: string;
  category: string;
  amount: number;
  note: string;
  currency: string;
  startDate: string;
  recurrenceType: RecurrenceType;
  recurrenceValue: string;
  endType: EndType;
  endValue?: string;
  confirmationType: ConfirmationType;
  status: PaymentStatus;
  nextDueDate: string;
}

export interface CreatePlannedPaymentRequest {
  owner: string;
  account: string;
  category: string;
  amount: number;
  note?: string;
  currency?: string;
  startDate: string;
  recurrenceType: RecurrenceType;
  recurrenceValue: string;
  endType: EndType;
  endValue?: string;
  confirmationType: ConfirmationType;
}
