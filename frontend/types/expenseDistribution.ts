export { TrendPeriod } from './balanceTrend';
import { TrendPeriod } from './balanceTrend';

export interface ExpenseDistributionItem {
  category: string;
  amount: number;
  percentage: number;
}

export interface ExpenseDistributionResponse {
  totalExpense: number;
  currency: string;
  distribution: ExpenseDistributionItem[];
}

export interface GetExpenseDistributionParams {
  owner: string;
  accounts: string[];
  period: TrendPeriod;
}
