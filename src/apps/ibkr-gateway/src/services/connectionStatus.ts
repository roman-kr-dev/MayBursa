import { config } from '../config/environment';
import { IBKRGateway, ConnectionStatus } from '@monorepo/ibkr-client';

export class ConnectionStatusService {
  async checkConnection(): Promise<boolean> {
    return IBKRGateway.checkConnection(config.IBKR_GATEWAY_PORT);
  }

  async checkApiAvailability(): Promise<boolean> {
    return IBKRGateway.checkApiAvailability(config.IBKR_GATEWAY_PORT);
  }

  async getGatewayStatus(): Promise<ConnectionStatus> {
    return IBKRGateway.getGatewayStatus(config.IBKR_GATEWAY_PORT);
  }

  async waitForConnection(timeout: number = 60000): Promise<boolean> {
    return IBKRGateway.waitForConnection(timeout, config.IBKR_GATEWAY_PORT);
  }

  async waitForApiAvailability(timeout: number = 30000): Promise<boolean> {
    return IBKRGateway.waitForApiAvailability(timeout, config.IBKR_GATEWAY_PORT);
  }

  getLastStatus(): ConnectionStatus | null {
    return IBKRGateway.getLastStatus();
  }

  async performHealthCheck(): Promise<{
    gateway: boolean;
    api: boolean;
    latency?: number;
  }> {
    return IBKRGateway.performHealthCheck(config.IBKR_GATEWAY_PORT);
  }
}

export const connectionStatus = new ConnectionStatusService();