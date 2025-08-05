import { Request, Response } from 'express';
import { clientPortalManager } from '../services/clientPortalManager';
import { connectionStatus } from '../services/connectionStatus';
import { authStatus } from '../services/authStatus';
import { getTradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';
import { getErrorMessage } from '../utils/errorUtils';

export const statusController = {
  async health(_req: Request, res: Response): Promise<void> {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString()
    });
  },

  async getGatewayStatus(_req: Request, res: Response): Promise<void> {
    try {
      const isRunning = clientPortalManager.isRunning();
      const pid = clientPortalManager.getProcessId();
      const connectionInfo = await connectionStatus.getGatewayStatus();
      const authInfo = authStatus.getLastSessionInfo();
      const tradingMode = getTradingMode();
      
      res.json({
        success: true,
        mode: tradingMode,
        warning: tradingMode === 'production' ? 'Running in PRODUCTION mode' : null,
        process: {
          isRunning,
          pid
        },
        connection: {
          isConnected: connectionInfo.isConnected,
          isApiAvailable: connectionInfo.isApiAvailable,
          latency: connectionInfo.latency,
          lastChecked: connectionInfo.lastChecked
        },
        authentication: authInfo ? {
          isValid: authInfo.isValid,
          authenticated: authInfo.authenticated,
          connected: authInfo.connected,
          competing: authInfo.competing,
          lastChecked: authInfo.lastChecked
        } : null
      });
    } catch (error) {
      logger.error('Failed to get gateway status:', getErrorMessage(error));
      res.status(500).json({
        success: false,
        error: 'Failed to get gateway status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  },

  async getTradingMode(_req: Request, res: Response): Promise<void> {
    const mode = getTradingMode();
    res.json({
      mode: mode,
      warning: mode === 'production' ? 'Running in PRODUCTION mode - REAL MONEY' : null
    });
  }
};