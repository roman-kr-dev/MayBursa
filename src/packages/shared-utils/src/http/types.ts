import { AxiosRequestConfig, InternalAxiosRequestConfig, AxiosError } from 'axios';

export interface HttpClientConfig {
  baseURL: string;
  timeout?: number;
  headers?: Record<string, string>;
  httpsAgent?: any;
  maxRetryAttempts?: number;
  baseRetryDelay?: number;
  maxRetryDelay?: number;
  circuitBreakerThreshold?: number;
  circuitBreakerCooldown?: number;
  circuitBreakerHalfOpenSuccessThreshold?: number;
  shouldRetry?: (error: AxiosError) => boolean;
  onRequestLog?: (config: InternalAxiosRequestConfig) => void;
  onResponseLog?: (response: any) => void;
  onErrorLog?: (error: AxiosError) => void;
}

export interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

export interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

export interface RequestOptions extends AxiosRequestConfig {
  skipRetry?: boolean;
  skipCircuitBreaker?: boolean;
}