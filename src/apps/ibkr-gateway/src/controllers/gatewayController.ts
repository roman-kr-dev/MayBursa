import { Request, Response } from 'express';
import { clientPortalManager } from '../services/clientPortalManager';
import { connectionStatus } from '../services/connectionStatus';
import { loginAutomation } from '../services/loginAutomation';
import { gatewayMonitor } from '../services/gatewayMonitor';
import { logger } from '@monorepo/shared-utils';

export const gatewayController = {
  async startGateway(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('API: Start gateway requested');

      // Check if already running
      if (clientPortalManager.isRunning()) {
        const pid = clientPortalManager.getProcessId();
        res.json({
          success: true,
          message: 'Gateway is already running',
          pid
        });
        return;
      }
      // Start the gateway
      await clientPortalManager.startGateway();

      const pid = clientPortalManager.getProcessId();

      res.json({
        success: true,
        message: 'Gateway started successfully',
        pid
      });

      // Wait for connection and authenticate in the background
      setTimeout(async () => {
        try {
          const connected = await connectionStatus.waitForConnection();
          if (connected) {
            await loginAutomation.authenticate();
            await gatewayMonitor.startMonitoring();
          }
        } catch (error) {
          logger.error('Background initialization failed:', error);
        }
      }, 1000);

    } catch (error) {
      logger.error('Failed to start gateway:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start gateway',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async stopGateway(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('API: Stop gateway requested');

      // Stop monitoring first
      await gatewayMonitor.stopMonitoring();

      // Stop the gateway
      await clientPortalManager.stopGateway();

      res.json({
        success: true,
        message: 'Gateway stopped successfully'
      });
    } catch (error) {
      logger.error('Failed to stop gateway:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop gateway',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async restartGateway(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('API: Restart gateway requested');

      // Stop monitoring
      await gatewayMonitor.stopMonitoring();

      // Kill existing processes
      await clientPortalManager.killExistingGateway();

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Start the gateway
      await clientPortalManager.startGateway();

      const pid = clientPortalManager.getProcessId();

      res.json({
        success: true,
        message: 'Gateway restarted successfully',
        pid
      });

      // Wait for connection and authenticate in the background
      setTimeout(async () => {
        try {
          const connected = await connectionStatus.waitForConnection();
          if (connected) {
            await loginAutomation.authenticate();
            await gatewayMonitor.startMonitoring();
          }
        } catch (error) {
          logger.error('Background initialization failed:', error);
        }
      }, 1000);

    } catch (error) {
      logger.error('Failed to restart gateway:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to restart gateway',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};