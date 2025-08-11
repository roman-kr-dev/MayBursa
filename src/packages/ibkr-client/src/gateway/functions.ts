import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { IBKRAuth } from '../auth';
import { getGatewayUrl, IBKRGatewayConfig } from '../config/environment';
import { ConnectionStatus, GatewayHealthCheck } from './types';
import { logger, HttpApiError } from '@monorepo/shared-utils';

/**
 * IBKR Gateway Service
 * Static class providing gateway connection and health check methods
 */
export class IBKRGateway {
  private static lastStatus: ConnectionStatus | null = null;

  /**
   * Create an axios instance for gateway checks
   * @param config Optional configuration overrides
   */
  private static createGatewayClient(config?: Partial<IBKRGatewayConfig>): AxiosInstance {
    const baseURL = getGatewayUrl(config);
    
    return axios.create({
      baseURL,
      timeout: config?.timeout || 5000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: config?.rejectUnauthorized ?? false
      })
    });
  }

  /**
   * Check if the gateway process is running and reachable
   * @param port Optional port override (defaults to config or 5001)
   * @returns True if gateway is reachable
   * @example
   * const isConnected = await IBKRGateway.checkConnection();
   * if (isConnected) {
   *   console.log('Gateway is running');
   * }
   */
  static async checkConnection(port?: number): Promise<boolean> {
    const startTime = Date.now();
    const config = port ? { gatewayPort: port } : undefined;
    const client = this.createGatewayClient(config);

    try {
      // Try to reach the gateway root endpoint (not an API endpoint)
      const response = await client.get('/');
      const latency = Date.now() - startTime;

      const isConnected = response.status === 200 || response.status === 302;

      this.lastStatus = {
        isConnected,
        isApiAvailable: false, // Will be checked separately
        latency,
        lastChecked: new Date()
      };

      logger.debug(`Gateway connection check: ${isConnected ? 'success' : 'failed'} (${latency}ms)`);
      return isConnected;

    } catch (error) {
      const latency = Date.now() - startTime;

      this.lastStatus = {
        isConnected: false,
        isApiAvailable: false,
        latency,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date()
      };

      logger.error('Gateway connection check failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Check if the gateway API is available and responding
   * @param port Optional port override
   * @returns True if API is available
   * @example
   * const apiReady = await IBKRGateway.checkApiAvailability();
   * if (apiReady) {
   *   // API is ready for requests
   * }
   */
  static async checkApiAvailability(_port?: number): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Use IBKRAuth to check auth status - this validates API is available
      await IBKRAuth.checkAuthStatus();
      
      const latency = Date.now() - startTime;

      if (this.lastStatus) {
        this.lastStatus.isApiAvailable = true;
        this.lastStatus.latency = latency;
      }

      return true;
    } catch (error) {
      if (this.lastStatus) {
        this.lastStatus.isApiAvailable = false;
      }

      // API might not be available yet, which is expected during startup
      if (error instanceof HttpApiError) {
        logger.debug('API availability check failed:', error.message);
      } else {
        logger.debug('API availability check failed:', error);
      }
      return false;
    }
  }

  /**
   * Get the current gateway status
   * @param port Optional port override
   * @returns Connection status with details
   */
  static async getGatewayStatus(port?: number): Promise<ConnectionStatus> {
    const isConnected = await this.checkConnection(port);

    if (isConnected) {
      await this.checkApiAvailability(port);
    }

    return this.lastStatus || {
      isConnected: false,
      isApiAvailable: false,
      error: 'No status available',
      lastChecked: new Date()
    };
  }

  /**
   * Wait for gateway connection to be established
   * @param timeout Maximum time to wait in milliseconds (default: 60000)
   * @param port Optional port override
   * @returns True if connection established within timeout
   */
  static async waitForConnection(timeout: number = 60000, port?: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds
    const gatewayUrl = getGatewayUrl(port ? { gatewayPort: port } : undefined);

    logger.info(`Waiting for gateway connection at ${gatewayUrl}...`);

    while (Date.now() - startTime < timeout) {
      const isConnected = await this.checkConnection(port);

      if (isConnected) {
        logger.info(`Gateway connection established at ${gatewayUrl}`);
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.error('Timeout waiting for gateway connection');
    return false;
  }

  /**
   * Wait for API to become available
   * @param timeout Maximum time to wait in milliseconds (default: 30000)
   * @param port Optional port override
   * @returns True if API available within timeout
   */
  static async waitForApiAvailability(timeout: number = 30000, port?: number): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    logger.info('Waiting for gateway API to be available...');

    while (Date.now() - startTime < timeout) {
      const apiAvailable = await this.checkApiAvailability(port);

      if (apiAvailable) {
        logger.info('Gateway API is now available');
        return true;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.error('Timeout waiting for API availability');
    return false;
  }

  /**
   * Perform a complete health check of the gateway
   * @param port Optional port override
   * @returns Health check results
   */
  static async performHealthCheck(port?: number): Promise<GatewayHealthCheck> {
    const gatewayConnected = await this.checkConnection(port);
    const apiAvailable = await this.checkApiAvailability(port);

    return {
      gateway: gatewayConnected,
      api: apiAvailable,
      latency: this.lastStatus?.latency
    };
  }

  /**
   * Get the last recorded status without performing new checks
   * @returns Last status or null if no checks performed
   */
  static getLastStatus(): ConnectionStatus | null {
    return this.lastStatus;
  }
}