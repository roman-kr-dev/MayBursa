import { connectionStatus } from './connectionStatus';
import { authStatus } from './authStatus';
import { loginAutomation } from './loginAutomation';
import { clientPortalManager } from './clientPortalManager';
import { logger } from '@monorepo/shared-utils';
import { config } from '../config/environment';

interface MonitorStatus {
  isMonitoring: boolean;
  lastCheck: Date | null;
  // Authentication monitoring
  authRetryCount: number;
  authMaxRetries: number;
  lastAuthAttempt: Date | null;
  authHasGivenUp: boolean;
  // Process monitoring
  processRunning: boolean;
  lastCrashTime: Date | null;
  restartAttempts: number;
  totalRestarts: number;
  lastRestartTime: Date | null;
  lastRestartAttempt: Date | null;
}

export class GatewayMonitorService {
  private monitorInterval: NodeJS.Timeout | null = null;
  private checkInterval = 10000; // Check every 10 seconds
  
  // Authentication monitoring
  private authRetryCount = 0;
  private authMaxRetries = 3;
  private authRetryDelay = 30000; // 30 seconds between auth attempts
  private lastAuthAttempt: Date | null = null;
  private authHasGivenUp = false;
  
  // Process monitoring
  private lastCrashTime: Date | null = null;
  private restartAttempts = 0;
  private totalRestarts = 0;
  private lastRestartTime: Date | null = null;
  private lastRestartAttempt: Date | null = null;
  private restartDelay = 30000; // 30 seconds between restart attempts
  private autoRestartEnabled = true;

  async startMonitoring(): Promise<void> {
    if (this.monitorInterval) {
      logger.warn('Authentication monitor is already running');
      return;
    }

    logger.info('Starting gateway monitor...');
    this.authHasGivenUp = false;
    this.autoRestartEnabled = config.IBKR_AUTO_RESTART !== false;

    // Initial check
    await this.performMonitoringCheck();

    // Set up periodic monitoring
    this.monitorInterval = setInterval(async () => {
      await this.performMonitoringCheck();
    }, this.checkInterval);

    logger.info('Gateway monitor started (checking every 10 seconds)');
  }

  async stopMonitoring(): Promise<void> {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info('Gateway monitor stopped');
    }
  }

  private async performMonitoringCheck(): Promise<void> {
    try {
      // Check process health first
      await this.checkProcessHealth();
      
      // Then check authentication
      await this.checkAndReauthenticate();
    } catch (error) {
      logger.error('Error in gateway monitor:', error);
    }
  }

  private async checkProcessHealth(): Promise<void> {
    try {
      const isRunning = clientPortalManager.isRunning();
      
      if (!isRunning) {
        logger.error('Gateway process crashed!');
        this.lastCrashTime = new Date();
        
        if (!this.autoRestartEnabled) {
          logger.info('Auto-restart is disabled, not attempting restart');
          return;
        }
        
        // Check if enough time has passed since last restart attempt
        if (this.lastRestartAttempt) {
          const timeSinceLastAttempt = Date.now() - this.lastRestartAttempt.getTime();
          if (timeSinceLastAttempt < this.restartDelay) {
            const remainingTime = Math.round((this.restartDelay - timeSinceLastAttempt) / 1000);
            logger.info(`Waiting ${remainingTime}s before next restart attempt`);
            return;
          }
        }
        
        // Attempt restart
        await this.restartGateway();
      }
    } catch (error) {
      logger.error('Error checking process health:', error);
    }
  }

  private async restartGateway(): Promise<void> {
    this.restartAttempts++;
    this.lastRestartAttempt = new Date();
    
    logger.info(`Attempting gateway restart (attempt #${this.restartAttempts})...`);
    
    try {
      // Start the gateway
      await clientPortalManager.startGateway();
      
      // Wait for connection
      logger.info('Waiting for gateway connection...');
      const connected = await connectionStatus.waitForConnection(60000);
      
      if (connected) {
        this.lastRestartTime = new Date();
        this.totalRestarts++;
        logger.info(`Gateway restarted successfully after ${this.restartAttempts} attempt(s)`);
        this.restartAttempts = 0; // Reset counter on success
        
        // Trigger authentication if auto-login is enabled
        if (config.IBKR_AUTO_LOGIN) {
          logger.info('Triggering authentication after restart...');
          setTimeout(async () => {
            try {
              await loginAutomation.authenticate();
            } catch (error) {
              logger.error('Failed to authenticate after restart:', error);
            }
          }, 5000); // Give gateway 5 seconds to stabilize
        }
      } else {
        logger.error(`Restart attempt #${this.restartAttempts} failed - gateway did not connect`);
      }
    } catch (error) {
      logger.error(`Restart attempt #${this.restartAttempts} failed:`, error);
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
        if (this.authRetryCount > 0) {
          this.authRetryCount = 0;
          this.authHasGivenUp = false;
          logger.info('Authentication restored, reset retry count');
        }
        return;
      }

      // Not authenticated - check if auto-login is disabled
      if (!config.IBKR_AUTO_LOGIN) {
        logger.debug('Session not valid, but auto-login is disabled - manual login required');
        return;
      }

      // Check if we should retry
      if (this.authHasGivenUp) {
        logger.debug('Authentication monitor has given up after max retries');
        return;
      }

      if (this.authRetryCount >= this.authMaxRetries) {
        this.authHasGivenUp = true;
        logger.error(`Given up authentication after ${this.authMaxRetries} attempts`);
        return;
      }

      // Check if enough time has passed since last attempt
      if (this.lastAuthAttempt) {
        const timeSinceLastAttempt = Date.now() - this.lastAuthAttempt.getTime();
        if (timeSinceLastAttempt < this.authRetryDelay) {
          const remainingTime = Math.round((this.authRetryDelay - timeSinceLastAttempt) / 1000);
          logger.debug(`Waiting ${remainingTime}s before next auth attempt`);
          return;
        }
      }

      // Attempt re-authentication
      await this.triggerReauthentication();

    } catch (error) {
      logger.error('Error in authentication check:', error);
    }
  }

  private async triggerReauthentication(): Promise<void> {
    this.authRetryCount++;
    this.lastAuthAttempt = new Date();
    
    logger.info(`Attempting re-authentication (attempt ${this.authRetryCount}/${this.authMaxRetries})...`);
    
    try {
      // First try the API reauthenticate endpoint
      const reauthSuccess = await authStatus.reauthenticate();
      
      if (reauthSuccess) {
        logger.info('Re-authentication via API successful');
        this.authRetryCount = 0;
        this.authHasGivenUp = false;
        return;
      }

      // If API reauth fails, try full Puppeteer authentication
      logger.info('API re-authentication failed, attempting full authentication...');
      const authSuccess = await loginAutomation.authenticate();
      
      if (authSuccess) {
        logger.info('Full authentication successful');
        this.authRetryCount = 0;
        this.authHasGivenUp = false;
      } else {
        logger.error(`Authentication failed (attempt ${this.authRetryCount}/${this.authMaxRetries})`);
        
        if (this.authRetryCount >= this.authMaxRetries) {
          this.authHasGivenUp = true;
          logger.error('Maximum authentication attempts reached, giving up');
        }
      }
    } catch (error) {
      logger.error('Re-authentication error:', error);
      
      if (this.authRetryCount >= this.authMaxRetries) {
        this.authHasGivenUp = true;
        logger.error('Maximum authentication attempts reached, giving up');
      }
    }
  }

  resetAuthRetryCount(): void {
    this.authRetryCount = 0;
    this.authHasGivenUp = false;
    this.lastAuthAttempt = null;
    logger.info('Authentication retry count reset');
  }

  getMonitorStatus(): MonitorStatus {
    return {
      isMonitoring: this.monitorInterval !== null,
      lastCheck: new Date(),
      // Authentication status
      authRetryCount: this.authRetryCount,
      authMaxRetries: this.authMaxRetries,
      lastAuthAttempt: this.lastAuthAttempt,
      authHasGivenUp: this.authHasGivenUp,
      // Process status
      processRunning: clientPortalManager.isRunning(),
      lastCrashTime: this.lastCrashTime,
      restartAttempts: this.restartAttempts,
      totalRestarts: this.totalRestarts,
      lastRestartTime: this.lastRestartTime,
      lastRestartAttempt: this.lastRestartAttempt
    };
  }

  async manualAuthenticate(): Promise<boolean> {
    logger.info('Manual authentication triggered');
    
    // Reset retry count for manual attempts
    this.resetAuthRetryCount();
    
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

export const gatewayMonitor = new GatewayMonitorService();