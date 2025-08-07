import axios from 'axios';
import https from 'https';
import { config } from '../config/environment';
import { apiClient, IBKRAPIError } from './apiClient';
import { logger } from '@monorepo/shared-utils';

interface ConnectionStatus {
  isConnected: boolean;
  isApiAvailable: boolean;
  latency?: number;
  error?: string;
  lastChecked: Date;
}

export class ConnectionStatusService {
  private lastStatus: ConnectionStatus | null = null;
  private gatewayAxios = axios.create({
    baseURL: `https://localhost:${config.IBKR_GATEWAY_PORT}`,
    timeout: 5000,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  async checkConnection(): Promise<boolean> {
    const startTime = Date.now();

    try {
      // Try to reach the gateway root endpoint (not an API endpoint)
      const response = await this.gatewayAxios.get('/');
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

  async checkApiAvailability(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Use apiClient to check auth status - this validates API is available
      await apiClient.checkAuthStatus();
      
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
      if (error instanceof IBKRAPIError) {
        logger.debug('API availability check failed:', error.message);
      } else {
        logger.debug('API availability check failed:', error);
      }
      return false;
    }
  }

  async getGatewayStatus(): Promise<ConnectionStatus> {
    const isConnected = await this.checkConnection();

    if (isConnected) {
      await this.checkApiAvailability();
    }

    return this.lastStatus || {
      isConnected: false,
      isApiAvailable: false,
      error: 'No status available',
      lastChecked: new Date()
    };
  }

  async waitForConnection(timeout: number = 60000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    logger.info('Waiting for gateway connection...');

    while (Date.now() - startTime < timeout) {
      const isConnected = await this.checkConnection();

      if (isConnected) {
        logger.info(`Gateway connection established at https://localhost:${config.IBKR_GATEWAY_PORT}`);
        return true;
      }

      // Simple fixed interval checking since apiClient handles retries
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.error('Timeout waiting for gateway connection');
    return false;
  }

  async waitForApiAvailability(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    logger.info('Waiting for gateway API to be available...');

    while (Date.now() - startTime < timeout) {
      const apiAvailable = await this.checkApiAvailability();

      if (apiAvailable) {
        logger.info('Gateway API is now available');
        return true;
      }

      // Simple fixed interval checking since apiClient handles retries
      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    logger.error('Timeout waiting for API availability');
    return false;
  }

  getLastStatus(): ConnectionStatus | null {
    return this.lastStatus;
  }

  async performHealthCheck(): Promise<{
    gateway: boolean;
    api: boolean;
    latency?: number;
  }> {
    const gatewayConnected = await this.checkConnection();
    const apiAvailable = await this.checkApiAvailability();

    return {
      gateway: gatewayConnected,
      api: apiAvailable,
      latency: this.lastStatus?.latency
    };
  }
}

export const connectionStatus = new ConnectionStatusService();