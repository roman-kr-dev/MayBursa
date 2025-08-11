import { IBKRAuth, AuthStatusResponse } from '@monorepo/ibkr-client';
import { getTradingMode, TradingMode } from '../config/environment';
import { logger, HttpApiError } from '@monorepo/shared-utils';

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
  private lastSessionInfo: SessionInfo | null = null;

  async checkAuthStatus(): Promise<AuthStatusResponse> {
    try {
      const status = await IBKRAuth.checkAuthStatus();

      // Update last session info
      this.lastSessionInfo = {
        isValid: status.authenticated && status.connected && !status.competing,
        authenticated: status.authenticated,
        connected: status.connected,
        competing: status.competing,
        serverVersion: status.serverInfo?.serverVersion,
        lastChecked: new Date()
      };

      logger.info('Auth status checked:', {
        authenticated: status.authenticated,
        connected: status.connected,
        competing: status.competing
      });

      return status;
    } catch (error) {
      logger.error('Failed to check auth status:', error);
      
      // If we can't reach the API, consider it not authenticated
      this.lastSessionInfo = {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastChecked: new Date()
      };

      // Return a default status if error occurs
      if (error instanceof HttpApiError) {
        return {
          authenticated: false,
          connected: false,
          competing: false,
          fail: error.message
        };
      }

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
      
      const response = await IBKRAuth.reauthenticate();
      
      if (response.message) {
        logger.info('Reauthentication response:', response.message);
      }

      // Wait a bit for the reauthentication to take effect
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check if we're authenticated now
      return await this.isSessionValid();
    } catch (error) {
      logger.error('Reauthentication failed:', error);
      return false;
    }
  }

  async keepAlive(): Promise<void> {
    try {
      await IBKRAuth.tickle();
      logger.debug('Keep-alive sent');
    } catch (error) {
      logger.error('Keep-alive failed:', error);
    }
  }

  async logout(): Promise<void> {
    try {
      const response = await IBKRAuth.logout();
      
      if (response.status) {
        logger.info('Logged out successfully');
      }
      
      this.lastSessionInfo = {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastChecked: new Date()
      };
    } catch (error) {
      logger.error('Logout failed:', error);
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