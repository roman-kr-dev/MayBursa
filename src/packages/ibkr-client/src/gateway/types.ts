/**
 * Gateway connection and status types
 */

export interface ConnectionStatus {
  isConnected: boolean;
  isApiAvailable: boolean;
  latency?: number;
  error?: string;
  lastChecked: Date;
}

export interface GatewayHealthCheck {
  gateway: boolean;
  api: boolean;
  latency?: number;
}