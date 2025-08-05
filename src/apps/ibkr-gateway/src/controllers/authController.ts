import { Request, Response } from 'express';
import { authStatus } from '../services/authStatus';
import { authMonitor } from '../services/authMonitor';
import { getTradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';
import { getErrorMessage } from '../utils/errorUtils';

export const authController = {
  async getAuthStatus(_req: Request, res: Response): Promise<void> {
    try {
      const status = await authStatus.checkAuthStatus();
      const sessionInfo = await authStatus.getSessionInfo();
      const tradingMode = getTradingMode();
      
      res.json({
        success: true,
        authenticated: status.authenticated,
        connected: status.connected,
        competing: status.competing,
        isValid: sessionInfo.isValid,
        tradingMode: tradingMode,
        serverVersion: status.serverInfo?.version,
        fail: status.fail,
        message: status.message
      });
    } catch (error) {
      logger.error('Failed to get auth status:', getErrorMessage(error));
      res.status(500).json({
        success: false,
        error: 'Failed to get authentication status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getMonitorStatus(_req: Request, res: Response): Promise<void> {
    try {
      const monitorStatus = authMonitor.getMonitorStatus();
      
      res.json({
        success: true,
        ...monitorStatus
      });
    } catch (error) {
      logger.error('Failed to get monitor status:', getErrorMessage(error));
      res.status(500).json({
        success: false,
        error: 'Failed to get monitor status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async triggerLogin(_req: Request, res: Response): Promise<void> {
    try {
      logger.info('API: Manual login requested');
      
      // This will reset retry count and attempt authentication
      const success = await authMonitor.manualAuthenticate();
      
      if (success) {
        res.json({
          success: true,
          message: 'Authentication successful'
        });
      } else {
        res.status(401).json({
          success: false,
          error: 'Authentication failed',
          message: 'Please check your credentials and try again'
        });
      }
    } catch (error) {
      logger.error('Failed to trigger login:', getErrorMessage(error));
      res.status(500).json({
        success: false,
        error: 'Failed to trigger login',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};