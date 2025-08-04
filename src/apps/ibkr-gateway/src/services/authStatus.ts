import axios, { AxiosInstance } from 'axios';
import https from 'https';
import { config, getTradingMode, TradingMode } from '../config/environment';
import { defaultLogger as logger } from '@monorepo/shared-utils';
import { getErrorMessage } from '../utils/errorUtils';

interface AuthStatusResponse {
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  fail?: string;
  message?: string;
  serverInfo?: {
    version: string;
  };
}

interface SessionInfo {
  isValid: boolean;
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  expiresIn?: number;
  serverVersion?: string;
  lastChecked: Date;
}

interface FullStatus {
  authenticated: boolean;
  sessionValid: boolean;
  tradingMode: TradingMode;
  apiAvailable: boolean;
  lastCheck: Date;
}

export class AuthenticationStatusService {
  private axiosInstance: AxiosInstance;
  private lastSessionInfo: SessionInfo | null = null;

  constructor() {
    // Create axios instance with self-signed certificate handling
    this.axiosInstance = axios.create({
      baseURL: `https://localhost:${config.IBKR_GATEWAY_PORT}/v1/api`,
      timeout: 10000,
      httpsAgent: new https.Agent({
        rejectUnauthorized: false
      }),
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });
  }

  async checkAuthStatus(): Promise<AuthStatusResponse> {
    try {
      // The /iserver/auth/status endpoint is the standard way to check authentication
      const response = await this.axiosInstance.get('/iserver/auth/status');
      
      const status: AuthStatusResponse = {
        authenticated: response.data.authenticated || false,
        connected: response.data.connected || false,
        competing: response.data.competing || false,
        fail: response.data.fail,
        message: response.data.message,
        serverInfo: response.data.serverInfo
      };

      // Update last session info
      this.lastSessionInfo = {
        isValid: status.authenticated && status.connected && !status.competing,
        authenticated: status.authenticated,
        connected: status.connected,
        competing: status.competing,
        serverVersion: status.serverInfo?.version,
        lastChecked: new Date()
      };

      logger.info('Auth status checked:', {
        authenticated: status.authenticated,
        connected: status.connected,
        competing: status.competing
      });

      return status;
    } catch (error) {
      logger.error('Failed to check auth status:', getErrorMessage(error));
      
      // If we can't reach the API, consider it not authenticated
      this.lastSessionInfo = {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastChecked: new Date()
      };

      return {
        authenticated: false,
        connected: false,
        competing: false,
        fail: 'Unable to reach gateway API'
      };
    }
  }

  async isSessionValid(): Promise<boolean> {
    const status = await this.checkAuthStatus();
    
    // Session is valid if:
    // 1. User is authenticated
    // 2. Connected to IBKR servers
    // 3. Not competing with another session
    return status.authenticated && status.connected && !status.competing;
  }

  async getSessionInfo(): Promise<SessionInfo> {
    await this.checkAuthStatus();
    
    if (!this.lastSessionInfo) {
      return {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastChecked: new Date()
      };
    }

    return this.lastSessionInfo;
  }

  async reauthenticate(): Promise<boolean> {
    try {
      logger.info('Attempting to reauthenticate...');
      
      // Try to reauthenticate using the API
      const response = await this.axiosInstance.post('/iserver/reauthenticate');
      
      if (response.data.message) {
        logger.info('Reauthentication response:', response.data.message);
      }

      // Wait a bit for the reauthentication to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're authenticated now
      return await this.isSessionValid();
    } catch (error) {
      logger.error('Reauthentication failed:', getErrorMessage(error));
      return false;
    }
  }

  async keepAlive(): Promise<void> {
    try {
      // Send a tickle request to keep the session alive
      await this.axiosInstance.post('/tickle');
      logger.debug('Keep-alive sent');
    } catch (error) {
      logger.error('Keep-alive failed:', getErrorMessage(error));
    }
  }

  async logout(): Promise<void> {
    try {
      await this.axiosInstance.post('/logout');
      logger.info('Logged out successfully');
      
      this.lastSessionInfo = {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Logout failed:', getErrorMessage(error));
    }
  }

  getLastSessionInfo(): SessionInfo | null {
    return this.lastSessionInfo;
  }

  async getFullStatus(): Promise<FullStatus> {
    const sessionInfo = await this.getSessionInfo();
    const tradingMode = getTradingMode();
    
    return {
      authenticated: sessionInfo.authenticated,
      sessionValid: sessionInfo.isValid,
      tradingMode: tradingMode,
      apiAvailable: sessionInfo.connected,
      lastCheck: sessionInfo.lastChecked
    };
  }
}

export const authStatus = new AuthenticationStatusService();