export { YAxisConfig } from './balanceTrend';
import { YAxisConfig } from './balanceTrend';

export enum DebtAggregation {
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY',
}

export interface DebtCategoryAmount {
  // The debt's display label - the payment's note, falling back to its
  // category when no note is set (see backend DebtTrendService.debtLabel).
  category: string;
  amount: number;
  // The planned payment's true category, always present, kept alongside so
  // the UI can show it as a chip next to the note label.
  originalCategory: string;
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
  // The backend scopes the query via the X-Delegated-Owner header, but owner
  // must still be part of the params so the React Query cache key changes
  // (and refetches) when the active profile switches.
  owner: string;
  from: string;
  to: string;
  aggregate: DebtAggregation;
}
