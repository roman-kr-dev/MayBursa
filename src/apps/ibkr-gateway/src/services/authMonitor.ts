import { connectionStatus } from './connectionStatus';
import { authStatus } from './authStatus';
import { loginAutomation } from './loginAutomation';
import { defaultLogger as logger } from '@monorepo/shared-utils';

interface MonitorStatus {
  isMonitoring: boolean;
  lastCheck: Date | null;
  retryCount: number;
  maxRetries: number;
  lastAuthAttempt: Date | null;
  hasGivenUp: boolean;
}

export class AuthenticationMonitorService {
  private monitorInterval: NodeJS.Timeout | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private retryDelay = 30000; // 30 seconds between attempts
  private lastAuthAttempt: Date | null = null;
  private hasGivenUp = false;
  private checkInterval = 10000; // Check every 10 seconds

  async startMonitoring(): Promise<void> {
    if (this.monitorInterval) {
      logger.warn('Authentication monitor is already running');
      return;
    }

    logger.info('Starting authentication monitor...');
    this.hasGivenUp = false;

    // Initial check
    await this.checkAndReauthenticate();

    // Set up periodic monitoring
    this.monitorInterval = setInterval(async () => {
      await this.checkAndReauthenticate();
    }, this.checkInterval);

    logger.info('Authentication monitor started (checking every 10 seconds)');
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('Authentication monitor stopped');
    }
  }

  private async checkAndReauthenticate(): Promise<void> {
    try {
      // First check if the API is available
      const connectionOk = await connectionStatus.checkApiAvailability();
      
      if (!connectionOk) {
        logger.debug('API not available, skipping auth check');
        return;
      }

      // Check authentication status
      const isAuthenticated = await authStatus.isSessionValid();
      
      if (isAuthenticated) {
        logger.debug('Session is valid');
        // Reset retry count on successful auth
        if (this.retryCount > 0) {
          this.retryCount = 0;
          this.hasGivenUp = false;
          logger.info('Authentication restored, reset retry count');
        }
        return;
      }

      // Not authenticated - check if we should retry
      if (this.hasGivenUp) {
        logger.debug('Authentication monitor has given up after max retries');
        return;
      }

      if (this.retryCount >= this.maxRetries) {
        this.hasGivenUp = true;
        logger.error(`Given up authentication after ${this.maxRetries} attempts`);
        return;
      }

      // Check if enough time has passed since last attempt
      if (this.lastAuthAttempt) {
        const timeSinceLastAttempt = Date.now() - this.lastAuthAttempt.getTime();
        if (timeSinceLastAttempt < this.retryDelay) {
          const remainingTime = Math.round((this.retryDelay - timeSinceLastAttempt) / 1000);
          logger.debug(`Waiting ${remainingTime}s before next auth attempt`);
          return;
        }
      }

      // Attempt re-authentication
      await this.triggerReauthentication();

    } catch (error) {
      logger.error('Error in authentication monitor:', error);
    }
  }

  private async triggerReauthentication(): Promise<void> {
    this.retryCount++;
    this.lastAuthAttempt = new Date();
    
    logger.info(`Attempting re-authentication (attempt ${this.retryCount}/${this.maxRetries})...`);
    
    try {
      // First try the API reauthenticate endpoint
      const reauthSuccess = await authStatus.reauthenticate();
      
      if (reauthSuccess) {
        logger.info('Re-authentication via API successful');
        this.retryCount = 0;
        this.hasGivenUp = false;
        return;
      }

      // If API reauth fails, try full Puppeteer authentication
      logger.info('API re-authentication failed, attempting full authentication...');
      const authSuccess = await loginAutomation.authenticate();
      
      if (authSuccess) {
        logger.info('Full authentication successful');
        this.retryCount = 0;
        this.hasGivenUp = false;
      } else {
        logger.error(`Authentication failed (attempt ${this.retryCount}/${this.maxRetries})`);
        
        if (this.retryCount >= this.maxRetries) {
          this.hasGivenUp = true;
          logger.error('Maximum authentication attempts reached, giving up');
        }
      }
    } catch (error) {
      logger.error('Re-authentication error:', error);
      
      if (this.retryCount >= this.maxRetries) {
        this.hasGivenUp = true;
        logger.error('Maximum authentication attempts reached, giving up');
      }
    }
  }

  resetRetryCount(): void {
    this.retryCount = 0;
    this.hasGivenUp = false;
    this.lastAuthAttempt = null;
    logger.info('Authentication retry count reset');
  }

  getMonitorStatus(): MonitorStatus {
    return {
      isMonitoring: this.monitorInterval !== null,
      lastCheck: new Date(),
      retryCount: this.retryCount,
      maxRetries: this.maxRetries,
      lastAuthAttempt: this.lastAuthAttempt,
      hasGivenUp: this.hasGivenUp
    };
  }

  async manualAuthenticate(): Promise<boolean> {
    logger.info('Manual authentication triggered');
    
    // Reset retry count for manual attempts
    this.resetRetryCount();
    
    // Stop monitoring during manual auth
    const wasMonitoring = this.monitorInterval !== null;
    if (wasMonitoring) {
      await this.stopMonitoring();
    }
    
    try {
      const success = await loginAutomation.authenticate();
      
      if (success) {
        logger.info('Manual authentication successful');
      } else {
        logger.error('Manual authentication failed');
      }
      
      // Restart monitoring if it was running
      if (wasMonitoring) {
        await this.startMonitoring();
      }
      
      return success;
    } catch (error) {
      logger.error('Manual authentication error:', error);
      
      // Restart monitoring if it was running
      if (wasMonitoring) {
        await this.startMonitoring();
      }
      
      return false;
    }
  }
}

export const authMonitor = new AuthenticationMonitorService();