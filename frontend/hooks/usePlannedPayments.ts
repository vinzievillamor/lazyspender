import { useQuery } from '@tanstack/react-query';
import {
  getPlannedPaymentsByStatus
} from '../services/plannedPayment.service';
import {
  PaymentStatus
} from '../types/plannedPayment';

export const usePlannedPaymentsByStatus = (
  owner: string,
  status: PaymentStatus) => {
  return useQuery({
    queryKey: [owner],
    queryFn: () => getPlannedPaymentsByStatus(owner, status)
  });
};

