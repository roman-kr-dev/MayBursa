import axios, { AxiosInstance, AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';
import https from 'https';
import { config } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

// API Configuration Constants
const API_TIMEOUT = 10000; // 10 seconds
const MAX_RETRY_ATTEMPTS = 3;
const BASE_RETRY_DELAY = 1000; // 1 second
const MAX_RETRY_DELAY = 10000; // 10 seconds
const CIRCUIT_BREAKER_THRESHOLD = 5; // failures before opening circuit
const CIRCUIT_BREAKER_COOLDOWN = 30000; // 30 seconds
const CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD = 2; // successes to close circuit

// Custom Error Classes
export class IBKRAPIError extends Error {
  constructor(
    message: string,
    public endpoint: string,
    public statusCode?: number,
    public responseData?: any,
    public attemptNumber?: number
  ) {
    super(message);
    this.name = 'IBKRAPIError';
  }
}

export class IBKRNetworkError extends IBKRAPIError {
  constructor(message: string, endpoint: string, attemptNumber?: number) {
    super(message, endpoint, undefined, undefined, attemptNumber);
    this.name = 'IBKRNetworkError';
  }
}

export class IBKRAuthenticationError extends IBKRAPIError {
  constructor(message: string, endpoint: string, responseData?: any) {
    super(message, endpoint, 401, responseData);
    this.name = 'IBKRAuthenticationError';
  }
}

export class IBKRRateLimitError extends IBKRAPIError {
  constructor(message: string, endpoint: string, responseData?: any) {
    super(message, endpoint, 429, responseData);
    this.name = 'IBKRRateLimitError';
  }
}

export class IBKRCircuitBreakerError extends IBKRAPIError {
  constructor(endpoint: string) {
    super(`Circuit breaker is open for endpoint: ${endpoint}`, endpoint);
    this.name = 'IBKRCircuitBreakerError';
  }
}

// Response Types
export interface AuthStatusResponse {
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  fail?: string;
  message?: string;
  MAC?: string;
  serverInfo?: {
    serverName?: string;
    serverVersion?: string;
  };
}

export interface TickleResponse {
  session?: string;
  ssoExpires?: number;
  collission?: boolean;
  userId?: number;
  iserver?: {
    authStatus?: {
      authenticated: boolean;
      competing: boolean;
      connected: boolean;
    };
  };
}

export interface SSOValidationResponse {
  USER_ID: number;
  USER_NAME: string;
  RESULT: boolean;
  AUTH_TIME: number;
  EXPIRES?: number;
  lastAccessed?: number;
  LOGIN_TYPE?: string;
  features?: Record<string, any>;
}

export interface ReauthResponse {
  message: string;
}

export interface LogoutResponse {
  status: boolean;
}

export interface SSOInitRequest {
  username?: string;
  token?: string;
  compete?: boolean;
}

export interface SSOInitResponse extends AuthStatusResponse {
  // Inherits all properties from AuthStatusResponse
}

// Circuit Breaker State
interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  successCount: number;
}

// Request Metrics
interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

/**
 * Centralized IBKR API Client with retry logic and circuit breaker pattern
 */
export class IBKRAPIClient {
  private axiosInstance: AxiosInstance;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private metrics: Map<string, RequestMetrics> = new Map();

  constructor() {
    // Create axios instance with IBKR Gateway configuration
    this.axiosInstance = axios.create({
      baseURL: `https://localhost:${config.IBKR_GATEWAY_PORT}/v1/api`,
      timeout: API_TIMEOUT,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Accept self-signed certificates
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    // Request interceptor
    this.axiosInstance.interceptors.request.use(
      (config) => {
        // Add empty body for POST requests without data (IBKR requirement)
        if (config.method === 'post' && !config.data) {
          config.data = {};
        }
        
        // Log outgoing request
        logger.debug(`API Request: ${config.method?.toUpperCase()} ${config.url}`, {
          headers: config.headers,
          data: config.data
        });
        
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
        logger.debug(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url} - ${response.status}`, {
          data: response.data
        });
        return response;
      },
      (error) => {
        if (error.response) {
          logger.error(`API Error Response: ${error.config?.method?.toUpperCase()} ${error.config?.url} - ${error.response.status}`, {
            data: error.response.data
          });
        } else if (error.request) {
          logger.error(`API Network Error: ${error.config?.method?.toUpperCase()} ${error.config?.url}`, {
            message: error.message
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    requestFn: () => Promise<AxiosResponse<T>>,
    endpoint: string
  ): Promise<T> {
    let lastError: Error | undefined;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        // Check circuit breaker
        if (this.isCircuitOpen(endpoint)) {
          throw new IBKRCircuitBreakerError(endpoint);
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
        if (attempt < MAX_RETRY_ATTEMPTS && this.shouldRetry(error as AxiosError)) {
          const delay = this.getRetryDelay(attempt);
          logger.debug(`Retrying ${endpoint} after ${delay}ms (attempt ${attempt}/${MAX_RETRY_ATTEMPTS})`);
          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError || new IBKRAPIError('Unknown error', endpoint);
  }

  /**
   * Check if circuit breaker is open for an endpoint
   */
  private isCircuitOpen(endpoint: string): boolean {
    const breaker = this.circuitBreakers.get(endpoint);
    if (!breaker) return false;

    if (breaker.state === 'OPEN') {
      // Check if cooldown period has passed
      if (Date.now() - breaker.lastFailureTime > CIRCUIT_BREAKER_COOLDOWN) {
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

  /**
   * Record successful request
   */
  private recordSuccess(endpoint: string, responseTime: number): void {
    // Update circuit breaker
    const breaker = this.circuitBreakers.get(endpoint);
    if (breaker) {
      if (breaker.state === 'HALF_OPEN') {
        breaker.successCount++;
        if (breaker.successCount >= CIRCUIT_BREAKER_HALF_OPEN_SUCCESS_THRESHOLD) {
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

  /**
   * Record failed request
   */
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
    } else if (breaker.failures >= CIRCUIT_BREAKER_THRESHOLD) {
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

  /**
   * Determine if request should be retried
   */
  private shouldRetry(error: AxiosError): boolean {
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

  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  private getRetryDelay(attempt: number): number {
    const exponentialDelay = BASE_RETRY_DELAY * Math.pow(2, attempt - 1);
    const jitter = Math.random() * 500;
    return Math.min(exponentialDelay + jitter, MAX_RETRY_DELAY);
  }

  /**
   * Handle and transform request errors
   */
  private handleRequestError(error: AxiosError, endpoint: string, attempt: number): Error {
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;

      if (status === 401) {
        return new IBKRAuthenticationError(
          'Authentication required',
          endpoint,
          data
        );
      }

      if (status === 429) {
        return new IBKRRateLimitError(
          'Rate limit exceeded',
          endpoint,
          data
        );
      }

      return new IBKRAPIError(
        `API request failed: ${error.message}`,
        endpoint,
        status,
        data,
        attempt
      );
    }

    if (error.request) {
      return new IBKRNetworkError(
        `Network error: ${error.message}`,
        endpoint,
        attempt
      );
    }

    return new IBKRAPIError(
      `Request setup error: ${error.message}`,
      endpoint,
      undefined,
      undefined,
      attempt
    );
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ========== PUBLIC API METHODS ==========

  /**
   * Check the current authentication status with IBKR Gateway
   * @returns {Promise<AuthStatusResponse>} Authentication status including connected, authenticated, and competing session info
   * @throws {IBKRAPIError} If the request fails after all retry attempts
   * @example
   * const status = await apiClient.checkAuthStatus();
   * if (status.authenticated && status.connected && !status.competing) {
   *   // Session is valid
   * }
   */
  async checkAuthStatus(): Promise<AuthStatusResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<AuthStatusResponse>('/iserver/auth/status'),
      '/iserver/auth/status'
    );
  }

  /**
   * Send a keep-alive signal to prevent session timeout
   * @description Prevents the gateway session from timing out after inactivity.
   * Should be called periodically (every 1-5 minutes) to maintain an active session.
   * @returns {Promise<TickleResponse>} Response indicating if the tickle was successful
   * @throws {IBKRAPIError} If the keep-alive request fails
   * @example
   * // Call every 1 minute to keep session alive
   * setInterval(() => apiClient.tickle(), 60000);
   */
  async tickle(): Promise<TickleResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<TickleResponse>('/tickle'),
      '/tickle'
    );
  }

  /**
   * Validate the current SSO (Single Sign-On) session
   * @description Validates the SSO session and returns detailed user information
   * including permissions, features, and session expiry details
   * @returns {Promise<SSOValidationResponse>} SSO validation details with user info
   * @throws {IBKRAPIError} If SSO validation fails or session is invalid
   * @example
   * const ssoInfo = await apiClient.validateSSO();
   * console.log(`Session expires: ${ssoInfo.EXPIRES}`);
   */
  async validateSSO(): Promise<SSOValidationResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.get<SSOValidationResponse>('/sso/validate'),
      '/sso/validate'
    );
  }

  /**
   * Re-authenticate the current brokerage session
   * @description Attempts to re-authenticate using existing session credentials.
   * Useful when session is still valid but authentication has expired.
   * @returns {Promise<ReauthResponse>} Response indicating if re-authentication was triggered
   * @throws {IBKRAPIError} If re-authentication fails
   * @example
   * if (!status.authenticated) {
   *   await apiClient.reauthenticate();
   *   // Wait and check status again
   * }
   */
  async reauthenticate(): Promise<ReauthResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<ReauthResponse>('/iserver/reauthenticate'),
      '/iserver/reauthenticate'
    );
  }

  /**
   * Logout from the current IBKR Gateway session
   * @description Terminates the current session. Any further API calls will require re-authentication.
   * @returns {Promise<LogoutResponse>} Confirmation of logout success
   * @throws {IBKRAPIError} If logout request fails
   * @example
   * await apiClient.logout();
   * // User must login again for any further operations
   */
  async logout(): Promise<LogoutResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<LogoutResponse>('/logout'),
      '/logout'
    );
  }

  /**
   * Initialize SSO session for brokerage authentication
   * @description After retrieving access token and Live Session Token, 
   * initialize the brokerage session with credentials
   * @param {SSOInitRequest} credentials - Authentication credentials including tokens
   * @returns {Promise<SSOInitResponse>} Session initialization response with auth status
   * @throws {IBKRAPIError} If SSO initialization fails
   * @example
   * const response = await apiClient.initSSO({
   *   username: 'user123',
   *   token: 'live_session_token'
   * });
   */
  async initSSO(credentials: SSOInitRequest): Promise<SSOInitResponse> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<SSOInitResponse>('/iserver/auth/ssodh/init', credentials),
      '/iserver/auth/ssodh/init'
    );
  }

  /**
   * Make a generic GET request to the IBKR API
   * @param {string} path - API endpoint path (without base URL)
   * @param {AxiosRequestConfig} config - Optional axios configuration
   * @returns {Promise<T>} Response data
   * @throws {IBKRAPIError} If the request fails
   */
  async get<T = any>(path: string, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.get<T>(path, config),
      path
    );
  }

  /**
   * Make a generic POST request to the IBKR API
   * @param {string} path - API endpoint path (without base URL)
   * @param {any} data - Request body data
   * @param {AxiosRequestConfig} config - Optional axios configuration
   * @returns {Promise<T>} Response data
   * @throws {IBKRAPIError} If the request fails
   */
  async post<T = any>(path: string, data?: any, config?: AxiosRequestConfig): Promise<T> {
    return this.executeWithRetry(
      () => this.axiosInstance.post<T>(path, data, config),
      path
    );
  }

  /**
   * Get circuit breaker status for all endpoints
   * @returns {Map<string, CircuitBreakerState>} Current circuit breaker states
   */
  getCircuitBreakerStatus(): Map<string, CircuitBreakerState> {
    return new Map(this.circuitBreakers);
  }

  /**
   * Get request metrics for all endpoints
   * @returns {Map<string, RequestMetrics>} Request metrics per endpoint
   */
  getMetrics(): Map<string, RequestMetrics> {
    return new Map(this.metrics);
  }

  /**
   * Reset circuit breaker for a specific endpoint
   * @param {string} endpoint - The endpoint to reset
   */
  resetCircuitBreaker(endpoint: string): void {
    this.circuitBreakers.delete(endpoint);
    logger.info(`Circuit breaker reset for endpoint: ${endpoint}`);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
    logger.info('All circuit breakers have been reset');
  }
}

// Export singleton instance
export const apiClient = new IBKRAPIClient();