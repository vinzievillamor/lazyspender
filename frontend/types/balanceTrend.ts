export enum TrendPeriod {
  LAST_12_WEEKS = 'LAST_12_WEEKS',
  LAST_YEAR = 'LAST_YEAR',
  FROM_START = 'FROM_START',
}

export interface BalanceTrendDataPoint {
  label: string;
  timestamp: string;
  balance: number;
  income: number;
  expense: number;
}

export interface YAxisConfig {
  minValue: number;
  maxValue: number;
  interval: number;
}

export interface BalanceTrendResponse {
  totalBalance: number;
  currency: string;
  dataPoints: BalanceTrendDataPoint[];
  yaxisConfig: YAxisConfig;
}

export interface GetBalanceTrendParams {
  owner: string;
  accounts: string[];
  period: TrendPeriod;
}
