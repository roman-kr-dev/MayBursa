import { Express, Router } from 'express';
import { gatewayController } from '../controllers/gatewayController';
import { authController } from '../controllers/authController';
import { statusController } from '../controllers/statusController';

export function setupRoutes(app: Express): void {
  const router = Router();
  
  // Health check
  router.get('/health', statusController.health);
  
  // Status endpoints
  router.get('/status', statusController.getGatewayStatus);
  router.get('/auth/status', authController.getAuthStatus);
  router.get('/auth/monitor', authController.getMonitorStatus);
  router.get('/config/mode', statusController.getTradingMode);
  
  // Gateway control endpoints
  router.post('/gateway/start', gatewayController.startGateway);
  router.post('/gateway/stop', gatewayController.stopGateway);
  router.post('/gateway/restart', gatewayController.restartGateway);
  
  // Authentication endpoints
  router.post('/auth/login', authController.triggerLogin);
  
  // Mount API routes
  app.use('/api', router);
}