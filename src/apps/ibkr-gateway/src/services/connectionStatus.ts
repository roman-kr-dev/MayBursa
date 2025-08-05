import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

interface ConnectionStatus {
  isConnected: boolean;
  isApiAvailable: boolean;
  latency?: number;
  error?: string;
  lastChecked: Date;
}

export class ConnectionStatusService {
  private axiosInstance: AxiosInstance;
  private lastStatus: ConnectionStatus | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 1000; // Start with 1 second

  constructor() {
    // Create axios instance with self-signed certificate handling
    this.axiosInstance = axios.create({
      baseURL: `https://localhost:${config.IBKR_GATEWAY_PORT}`,
      timeout: 5000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'Accept': 'application/json'
      }
    });
  }

  async checkConnection(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Try to reach the gateway root endpoint
      const response = await this.axiosInstance.get('/');
      const latency = Date.now() - startTime;
      
      const isConnected = response.status === 200 || response.status === 302;
      
      this.lastStatus = {
        isConnected,
        isApiAvailable: false, // Will be checked separately
        latency,
        lastChecked: new Date()
      };
      
      // Reset retry count on success
      this.retryCount = 0;
      this.retryDelay = 1000;
      
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
    try {
      // Check if the API endpoints are available
      const response = await this.axiosInstance.get('/v1/api/iserver/auth/status');
      
      const isAvailable = response.status === 200;
      
      if (this.lastStatus) {
        this.lastStatus.isApiAvailable = isAvailable;
      }
      
      return isAvailable;
    } catch (error) {
      if (this.lastStatus) {
        this.lastStatus.isApiAvailable = false;
      }
      
      // API might not be available yet, which is expected during startup
      logger.debug('API availability check failed:', error instanceof Error ? error.message : 'Unknown error');
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
    
    logger.info('Waiting for gateway connection...');
    
    while (Date.now() - startTime < timeout) {
      const isConnected = await this.checkConnection();
      
      if (isConnected) {
        logger.info('Gateway connection established');
        
        // Wait a bit more for API to be ready
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const apiAvailable = await this.checkApiAvailability();
        if (apiAvailable) {
          logger.info('Gateway API is available');
          return true;
        }
      }
      
      // Exponential backoff with jitter
      const jitter = Math.random() * 500;
      const delay = Math.min(this.retryDelay * Math.pow(2, this.retryCount), 10000) + jitter;
      
      logger.debug(`Retrying connection in ${Math.round(delay)}ms (attempt ${this.retryCount + 1}/${this.maxRetries})`);
      
      await new Promise(resolve => setTimeout(resolve, delay));
      this.retryCount++;
      
      if (this.retryCount >= this.maxRetries) {
        this.retryCount = 0; // Reset for next cycle
      }
    }
    
    logger.error('Timeout waiting for gateway connection');
    return false;
  }

  async waitForApiAvailability(timeout: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    logger.info('Waiting for gateway API to be available...');
    
    while (Date.now() - startTime < timeout) {
      const apiAvailable = await this.checkApiAvailability();
      
      if (apiAvailable) {
        logger.info('Gateway API is now available');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
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