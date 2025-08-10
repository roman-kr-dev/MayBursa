import { Request, Response } from 'express';
import { gatewayStateManager } from '../services/gatewayStateManager';
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
      // Get cached state from state manager (no API calls)
      const status = gatewayStateManager.getFormattedStatus();
      
      res.json(status);
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