export { YAxisConfig } from './balanceTrend';
import { YAxisConfig } from './balanceTrend';

export enum DebtAggregation {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface DebtCategoryAmount {
  category: string;
  amount: number;
}

export interface DebtTrendDataPoint {
  label: string;
  timestamp: string;
  totalDebt: number;
  categories: DebtCategoryAmount[];
}

export interface DebtTrendResponse {
  totalDebt: number;
  currency: string;
  dataPoints: DebtTrendDataPoint[];
  yAxisConfig: YAxisConfig;
}

export interface GetDebtTrendParams {
  from: string;
  to: string;
  aggregate: DebtAggregation;
}
