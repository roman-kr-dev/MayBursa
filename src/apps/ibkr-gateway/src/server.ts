import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { getTradingMode, config } from './config/environment';
import { logger } from '@monorepo/shared-utils';
import { clientPortalManager } from './services/clientPortalManager';
import { connectionStatus } from './services/connectionStatus';
import { loginAutomation } from './services/loginAutomation';
import { authMonitor } from './services/authMonitor';
import { setupRoutes } from './api/routes';

async function initializeGateway(): Promise<void> {
  try {
    const tradingMode = getTradingMode();

    logger.info('========================================');
    logger.info(`Starting IBKR Gateway in ${tradingMode.toUpperCase()} MODE`);
    if (tradingMode === 'production') {
      logger.warn('⚠️  WARNING: Running in PRODUCTION mode with REAL MONEY');
    }
    logger.info('========================================');

    logger.info('Initializing IBKR Gateway...');

    // Kill any existing gateway processes
    logger.info('Killing any existing gateway processes...');
    await clientPortalManager.killExistingGateway();

    // Start the gateway
    logger.info('Starting gateway process...');
    await clientPortalManager.startGateway();

    // Wait for gateway to be ready
    logger.info('Waiting for gateway connection...');
    const connected = await connectionStatus.waitForConnection(60000);

    if (!connected) {
      throw new Error('Failed to establish connection to gateway');
    }

    // Check if auto-login is enabled
    if (config.IBKR_AUTO_LOGIN) {
      // Trigger authentication
      logger.info('Triggering authentication...');
      const authenticated = await loginAutomation.authenticate();

      if (!authenticated) {
        logger.error('Initial authentication failed - manual intervention may be required');
      }
    } else {
      logger.info('Auto-login disabled (IBKR_AUTO_LOGIN=false) - manual login required');
    }

    // Start authentication monitoring (always runs to detect manual logins)
    logger.info('Starting authentication monitor...');
    await authMonitor.startMonitoring();

    logger.info('Gateway initialization complete');
  } catch (error) {
    logger.error('Failed to initialize gateway:', error);
    throw error;
  }
}

export async function createServer(): Promise<Express> {
  const app = express();

  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, _res: Response, next: NextFunction) => {
    logger.debug(`${req.method} ${req.path}`, {
      query: req.query,
      body: req.body,
      ip: req.ip
    });
    next();
  });

  // CORS configuration
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Static files (for control panel UI)
  app.use(express.static(path.join(__dirname, '../public')));

  // API routes
  setupRoutes(app);

  // Root route - serve control panel
  app.get('/', (_req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Error handling middleware
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  });

  // 404 handler
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Initialize gateway on server start
  initializeGateway().catch(error => {
    logger.error('Gateway initialization failed:', error);
    // Continue running the server even if gateway init fails
    // This allows manual control through the UI
  });

  return app;
}