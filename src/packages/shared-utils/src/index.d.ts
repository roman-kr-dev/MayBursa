import type { ApiResponse, ApiError } from '@monorepo/shared-types';
export declare const formatDate: (date: Date | string, format?: "short" | "long" | "iso") => string;
export declare const formatTime: (date: Date | string, includeSeconds?: boolean) => string;
export declare const formatDateTime: (date: Date | string) => string;
export declare const getRelativeTime: (date: Date | string) => string;
export declare const formatCurrency: (amount: number, currency?: "USD" | "EUR" | "GBP", showCents?: boolean) => string;
export declare const formatNumber: (num: number, decimals?: number, useCommas?: boolean) => string;
export declare const formatPercentage: (value: number, decimals?: number, includeSign?: boolean) => string;
export declare const formatCompactNumber: (num: number) => string;
export declare const createSuccessResponse: <T>(data: T, meta?: Partial<ApiResponse<T>["meta"]>) => ApiResponse<T>;
export declare const createErrorResponse: <T = any>(error: Partial<ApiError> & {
    message: string;
}) => ApiResponse<T>;
export declare const isApiError: <T>(response: ApiResponse<T>) => response is ApiResponse<T> & {
    error: ApiError;
};
export declare const generateRequestId: () => string;
export declare const sleep: (ms: number) => Promise<void>;
export declare const debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => ((...args: Parameters<T>) => void);
export declare const throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => ((...args: Parameters<T>) => void);
export declare const clamp: (value: number, min: number, max: number) => number;
export declare const roundToDecimal: (value: number, decimals: number) => number;
export declare const parseNumberSafely: (value: string | number, fallback?: number) => number;
export { createLogger, defaultLogger, safeStringify, type Logger, type LoggerOptions, type LogLevel, type TransportConfig, type LogFormat } from './logger';
//# sourceMappingURL=index.d.ts.map