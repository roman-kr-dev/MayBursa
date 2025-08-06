import express, { Express, Request, Response, NextFunction } from 'express';
import path from 'path';
import { execSync } from 'child_process';
import { getTradingMode, config } from './config/environment';
import { logger } from '@monorepo/shared-utils';
import { clientPortalManager } from './services/clientPortalManager';
import { connectionStatus } from './services/connectionStatus';
import { loginAutomation } from './services/loginAutomation';
import { gatewayMonitor } from './services/gatewayMonitor';
import { setupRoutes } from './api/routes';

async function initializeGateway(): Promise<void> {
  try {
    const tradingMode = getTradingMode();

    logger.info('========================================');
    logger.info(`Starting IBKR Gateway in ${tradingMode.toUpperCase()} MODE`);
    if (tradingMode === 'production') {
      logger.warn('⚠️  WARNING: Running in PRODUCTION mode with REAL MONEY');
    }

    await clientPortalManager.startGateway();

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

      // Start authentication monitoring
      await gatewayMonitor.startMonitoring();
    } else {
      logger.info('Auto-login disabled (IBKR_AUTO_LOGIN=false) - manual login required');
    }

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

export async function killExistingServer(): Promise<void> {
  try {
    const controlPanelPort = config.IBKR_GATEWAY_SERVER_POST;
    if (process.platform === 'darwin' || process.platform === 'linux') {
      try {
        // Find and kill processes using the control panel port
        const pids = execSync(`lsof -ti :${controlPanelPort} 2>/dev/null || true`, { encoding: 'utf8' })
          .trim()
          .split('\n')
          .filter(Boolean);

        for (const pid of pids) {
          try {
            execSync(`kill -9 ${pid}`, { stdio: 'ignore' });
            logger.info(`Killed process ${pid} on port ${controlPanelPort}`);
          } catch (error) {
            // Process might have already exited
          }
        }
      } catch (error) {
        // No processes found on the port
      }
    } else if (process.platform === 'win32') {
      try {
        // Find processes using the port on Windows
        const output = execSync(`netstat -ano | findstr :${controlPanelPort}`, { encoding: 'utf8' });
        const lines = output.trim().split('\n');

        const pids = new Set<string>();
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          const pid = parts[parts.length - 1];
          if (pid && pid !== '0') {
            pids.add(pid);
          }
        }

        for (const pid of pids) {
          try {
            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
            logger.info(`Killed process ${pid} on port ${controlPanelPort}`);
          } catch (error) {
            // Process might have already exited
          }
        }
      } catch (error) {
        // No processes found on the port
      }
    }

    logger.info('Killed any existing control panel processes');

    // Wait a bit for port to be released
    await new Promise(resolve => setTimeout(resolve, 1000));
  } catch (error) {
    logger.error('Error killing existing control panel:', error);
  }
}