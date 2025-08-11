import axios, { AxiosInstance, AxiosError, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../logger';
import {
  HttpClientConfig,
  CircuitBreakerState,
  RequestMetrics,
  RequestOptions
} from './types';
import {
  HttpApiError,
  NetworkError,
  AuthenticationError,
  RateLimitError,
  CircuitBreakerError
} from './errors';

const DEFAULT_CONFIG = {
  timeout: 10000,
  maxRetryAttempts: 3,
  baseRetryDelay: 1000,
  maxRetryDelay: 10000,
  circuitBreakerThreshold: 5,
  circuitBreakerCooldown: 30000,
  circuitBreakerHalfOpenSuccessThreshold: 2
};

export class HttpClient {
  private axiosInstance: AxiosInstance;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private metrics: Map<string, RequestMetrics> = new Map();
  private config: Required<HttpClientConfig>;

  constructor(config: HttpClientConfig) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      shouldRetry: config.shouldRetry || this.defaultShouldRetry,
      onRequestLog: config.onRequestLog || this.defaultRequestLog,
      onResponseLog: config.onResponseLog || this.defaultResponseLog,
      onErrorLog: config.onErrorLog || this.defaultErrorLog
    } as Required<HttpClientConfig>;

    this.axiosInstance = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: this.config.headers,
      httpsAgent: this.config.httpsAgent
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Ensure POST/PUT/PATCH requests have a body
        if (config.method && ['post', 'put', 'patch'].includes(config.method) && !config.data) {
          config.data = {};
        }
        
        this.config.onRequestLog(config);
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.axiosInstance.interceptors.response.use(
      (response) => {
        this.config.onResponseLog(response);
        return response;
      },
      (error) => {
        this.config.onErrorLog(error);
        return Promise.reject(error);
      }
    );
  }

  private defaultRequestLog(config: InternalAxiosRequestConfig): void {
    logger.debug(`HTTP Request: ${config.method?.toUpperCase()} ${config.url}`, {
      headers: config.headers,
      data: config.data
    });
  }

  private defaultResponseLog(response: AxiosResponse): void {
    logger.debug(`HTTP Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`, {
      data: response.data
    });
  }

  private defaultErrorLog(error: AxiosError): void {
    if (error.response) {
      logger.error(`HTTP Error Response: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, {
        data: error.response.data
      });
    } else if (error.request) {
      logger.error(`HTTP Network Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
        message: error.message
      });
    }
  }

  private defaultShouldRetry(error: AxiosError): boolean {
    if (!error.response) {
      // Network error - retry
      return true;
    }

    const status = error.response.status;
    
    // Don't retry client errors except rate limiting
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }

    // Retry server errors and rate limiting
    return status >= 500 || status === 429;
  }

  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    endpoint: string,
    options?: RequestOptions
  ): Promise<T> {
    let lastError: Error | undefined;
    const startTime = Date.now();
    const maxAttempts = options?.skipRetry ? 1 : this.config.maxRetryAttempts;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Check circuit breaker
        if (!options?.skipCircuitBreaker && this.isCircuitOpen(endpoint)) {
          throw new CircuitBreakerError(endpoint);
        }

        // Execute request
        const response = await requestFn();
        
        // Record success
        this.recordSuccess(endpoint, Date.now() - startTime);
        
        return response.data;

      } catch (error) {
        lastError = this.handleRequestError(error as AxiosError, endpoint, attempt);
        
        // Record failure
        this.recordFailure(endpoint);

        // Check if we should retry
        if (attempt < maxAttempts && !options?.skipRetry && this.config.shouldRetry(error as AxiosError)) {
          const delay = this.getRetryDelay(attempt);
          logger.debug(`Retrying ${endpoint} after ${delay}ms (attempt ${attempt}/${maxAttempts})`);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError || new HttpApiError('Unknown error', endpoint);
  }

  private isCircuitOpen(endpoint: string): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    if (breaker.state === 'OPEN') {
      // Check if cooldown period has passed
      if (Date.now() - breaker.lastFailureTime > this.config.circuitBreakerCooldown) {
        // Move to half-open state
        breaker.state = 'HALF_OPEN';
        breaker.successCount = 0;
        logger.info(`Circuit breaker for ${endpoint} moved to HALF_OPEN state`);
        return false; // Allow test request
      }
      return true; // Still in cooldown
    }

    return false;
  }

  private recordSuccess(endpoint: string, responseTime: number): void {
    // Update circuit breaker
    const breaker = this.circuitBreakers.get(endpoint);
    if (breaker) {
      if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++;
        if (breaker.successCount >= this.config.circuitBreakerHalfOpenSuccessThreshold) {
          breaker.state = 'CLOSED';
          breaker.failures = 0;
          breaker.successCount = 0;
          logger.info(`Circuit breaker for ${endpoint} closed after successful recovery`);
        }
      } else if (breaker.state === 'CLOSED') {
        breaker.failures = 0; // Reset failure count on success
      }
    }

    // Update metrics
    const metrics = this.metrics.get(endpoint) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: Date.now()
    };

    metrics.totalRequests++;
    metrics.successfulRequests++;
    metrics.averageResponseTime = 
      (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;
    metrics.lastRequestTime = Date.now();

    this.metrics.set(endpoint, metrics);
  }

  private recordFailure(endpoint: string): void {
    // Update circuit breaker
    let breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) {
      breaker = {
        failures: 0,
        lastFailureTime: Date.now(),
        state: 'CLOSED',
        successCount: 0
      };
      this.circuitBreakers.set(endpoint, breaker);
    }

    breaker.failures++;
    breaker.lastFailureTime = Date.now();

    if (breaker.state === 'HALF_OPEN') {
      // Failed during test, reopen circuit
      breaker.state = 'OPEN';
      breaker.successCount = 0;
      logger.warn(`Circuit breaker for ${endpoint} reopened after test failure`);
    } else if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.state = 'OPEN';
      logger.warn(`Circuit breaker for ${endpoint} opened after ${breaker.failures} failures`);
    }

    // Update metrics
    const metrics = this.metrics.get(endpoint) || {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: Date.now()
    };

    metrics.totalRequests++;
    metrics.failedRequests++;
    metrics.lastRequestTime = Date.now();

    this.metrics.set(endpoint, metrics);
  }

  private getRetryDelay(attempt: number): number {
    const exponentialDelay = this.config.baseRetryDelay * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 500;
    return Math.min(exponentialDelay + jitter, this.config.maxRetryDelay);
  }

  private handleRequestError(error: AxiosError, endpoint: string, attempt: number): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return new AuthenticationError(
          'Authentication required',
          endpoint,
          data
        );
      }

      if (status === 429) {
        return new RateLimitError(
          'Rate limit exceeded',
          endpoint,
          data
        );
      }

      return new HttpApiError(
        `API request failed: ${error.message}`,
        endpoint,
        status,
        data,
        attempt
      );
    }

    if (error.request) {
      return new NetworkError(
        `Network error: ${error.message}`,
        endpoint,
        attempt
      );
    }

    return new HttpApiError(
      `Request setup error: ${error.message}`,
      endpoint,
      undefined,
      undefined,
      attempt
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Public API methods

  async get<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.get<T>(path, options),
      path,
      options
    );
  }

  async post<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<T>(path, data, options),
      path,
      options
    );
  }

  async put<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.put<T>(path, data, options),
      path,
      options
    );
  }

  async patch<T = any>(path: string, data?: any, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.patch<T>(path, data, options),
      path,
      options
    );
  }

  async delete<T = any>(path: string, options?: RequestOptions): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.delete<T>(path, options),
      path,
      options
    );
  }

  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  getMetrics(): Map<string, RequestMetrics> {
    return new Map(this.metrics);
  }

  resetCircuitBreaker(endpoint: string): void {
    this.circuitBreakers.delete(endpoint);
    logger.info(`Circuit breaker reset for endpoint: ${endpoint}`);
  }

  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
    logger.info('All circuit breakers have been reset');
  }
}