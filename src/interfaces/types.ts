// ======================
// Core Statistics Types
// ======================
export interface CursorStats {
  currentMonth: {
    month: number;
    year: number;
    usageBasedPricing: UsageBasedPricing;
  };
  lastMonth: {
    month: number;
    year: number;
    usageBasedPricing: UsageBasedPricing;
  };
  premiumRequests: {
    current: number;
    limit: number;
    startOfMonth: string;
  };
}

export interface UsageBasedPricing {
  items: UsageItem[];
  hasUnpaidMidMonthInvoice: boolean;
  midMonthPayment: number;
}

export interface UsageItem {
  totalDollars: string;
  model: string;
  requestCount: number;
  costPerRequest: number;
}

// ======================
// Database Types
// ======================
export interface SQLiteRow {
  value: string;
}

export interface SQLiteError extends Error {
  code?: string;
  errno?: number;
}

// ======================
// API Error Types
// ======================
export interface AxiosErrorData {
  status?: number;
  data?: any;
  message?: string;
}

export interface ExtendedAxiosError {
  response?: AxiosErrorData;
  message: string;
}

// ======================
// Composer & Timing Types
// ======================
export interface ComposerData {
  conversation: Array<{
    timingInfo?: {
      clientStartTime: number;
      [key: string]: any;
    };
    [key: string]: any;
  }>;
}

export interface TimingInfo {
  key: string;
  timestamp: number;
  timingInfo: {
    clientStartTime: number;
    [key: string]: any;
  };
}

// ======================
// Usage Limit Types
// ======================
export interface UsageLimitResponse {
  hardLimit?: number;
  noUsageBasedAllowed?: boolean;
}

export interface ReleaseCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  isPrerelease: boolean;
  releaseUrl: string;
  releaseNotes: string;
  releaseName: string;
  zipballUrl: string;
  tarballUrl: string;
  assets: Array<{
    name: string;
    downloadUrl: string;
  }>;
}

// ======================
// API Response Types
// ======================
export interface CursorUsageResponse {
  'gpt-4': {
    numRequests: number;
    numRequestsTotal: number;
    numTokens: number;
    maxRequestUsage: number;
    maxTokenUsage: number | null;
  };
  'gpt-3.5-turbo': {
    numRequests: number;
    numRequestsTotal: number;
    numTokens: number;
    maxRequestUsage: number | null;
    maxTokenUsage: number | null;
  };
  'gpt-4-32k': {
    numRequests: number;
    numRequestsTotal: number;
    numTokens: number;
    maxRequestUsage: number | null;
    maxTokenUsage: number | null;
  };
  startOfMonth: string;
}

// ======================
// Status Bar Tooltip Types
// ======================
export interface TooltipError {
  message: string;
  details?: string;
}

export interface PremiumStats {
  current: number;
  limit: number;
  startOfMonth: string;
  percentage: number;
}

export interface UsageBasedStats {
  isEnabled: boolean;
  limit?: number;
  currentCost: number;
  items: UsageItem[];
  billingPeriod: string;
  midMonthPayment?: number;
}

export interface CursorTooltipData {
  premiumStats?: PremiumStats;
  usageBasedStats?: UsageBasedStats;
  error?: TooltipError;
  lastUpdated: string;
}
