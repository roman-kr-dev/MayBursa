import https from 'https';
import { HttpClient, HttpClientConfig } from '@monorepo/shared-utils';

export interface IBKRClientConfig {
  baseURL?: string;
  timeout?: number;
}

/**
 * Interactive Brokers API Client
 * Provides a minimal interface to interact with the IBKR Gateway API
 */
export class IBKRClient {
  private httpClient: HttpClient;

  constructor(config?: IBKRClientConfig) {
    const ibkrConfig: HttpClientConfig = {
      baseURL: config?.baseURL || 'https://localhost:5001',
      timeout: config?.timeout || 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false // Accept self-signed certificates from IBKR Gateway
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    };

    this.httpClient = new HttpClient(ibkrConfig);
  }

  /**
   * Get server information to test connectivity
   * This is a simple endpoint that returns basic server info
   * @returns Server information including version
   */
  async getServerInfo(): Promise<any> {
    try {
      // Try the tickle endpoint which returns basic server info
      return await this.httpClient.post('/v1/api/tickle');
    } catch (error) {
      // If tickle fails, try a simple GET to check connectivity
      return await this.httpClient.get('/');
    }
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus() {
    return this.httpClient.getCircuitBreakerStatus();
  }

  /**
   * Get request metrics for monitoring
   */
  getMetrics() {
    return this.httpClient.getMetrics();
  }

  /**
   * Reset circuit breaker for a specific endpoint
   */
  resetCircuitBreaker(endpoint: string) {
    return this.httpClient.resetCircuitBreaker(endpoint);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers() {
    return this.httpClient.resetAllCircuitBreakers();
  }

  /**
   * Get the underlying HTTP client for direct access if needed
   * This allows extending classes to use the configured client directly
   */
  protected getHttpClient(): HttpClient {
    return this.httpClient;
  }
}