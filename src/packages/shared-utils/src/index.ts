import type { ApiResponse, ApiError } from '@monorepo/shared-types';

// Date Formatting Utilities
export const formatDate = (date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  switch (format) {
    case 'short':
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    case 'long':
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    case 'iso':
      return d.toISOString();
    default:
      return d.toLocaleDateString();
  }
};

export const formatTime = (date: Date | string, includeSeconds = false): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined
  });
};

export const formatDateTime = (date: Date | string): string => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const getRelativeTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);

  if (diffSecs < 60) return 'just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  
  return formatDate(d);
};

// Number Formatting Utilities
export const formatCurrency = (
  amount: number, 
  currency: 'USD' | 'EUR' | 'GBP' = 'USD',
  showCents = true
): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0
  }).format(amount);
};

export const formatNumber = (
  num: number, 
  decimals = 0,
  useCommas = true
): string => {
  if (useCommas) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(num);
  }
  return num.toFixed(decimals);
};

export const formatPercentage = (
  value: number,
  decimals = 2,
  includeSign = true
): string => {
  const formatted = formatNumber(value, decimals);
  const sign = includeSign && value > 0 ? '+' : '';
  return `${sign}${formatted}%`;
};

export const formatCompactNumber = (num: number): string => {
  const formatter = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short'
  });
  return formatter.format(num);
};

// API Response Helpers
export const createSuccessResponse = <T>(
  data: T,
  meta?: Partial<ApiResponse<T>['meta']>
): ApiResponse<T> => {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date(),
      requestId: generateRequestId(),
      ...meta
    }
  };
};

export const createErrorResponse = <T = any>(
  error: Partial<ApiError> & { message: string }
): ApiResponse<T> => {
  return {
    success: false,
    error: {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      details: error.details
    },
    meta: {
      timestamp: new Date(),
      requestId: generateRequestId()
    }
  };
};

export const isApiError = <T>(response: ApiResponse<T>): response is ApiResponse<T> & { error: ApiError } => {
  return !response.success && !!response.error;
};

// Utility Functions
export const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const sleep = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;
  
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const roundToDecimal = (value: number, decimals: number): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

export const parseNumberSafely = (value: string | number, fallback = 0): number => {
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? fallback : parsed;
};

// Logger exports
export { 
  createLogger, 
  createAppLogger,
  defaultLogger,
  logger,
  safeStringify,
  type Logger,
  type LoggerOptions,
  type LogLevel,
  type TransportConfig,
  type LogFormat
} from './logger';