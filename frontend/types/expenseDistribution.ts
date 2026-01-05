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

export interface ContributorItem {
  note: string;
  amount: number;
  count: number;
}

export interface ContributorsResponse {
  category: string;
  totalCategoryAmount: number;
  currency: string;
  contributors: ContributorItem[];
}

export interface GetContributorsParams {
  owner: string;
  category: string;
  period: TrendPeriod;
}
