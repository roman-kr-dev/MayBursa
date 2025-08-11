/**
 * IBKR Client Configuration
 * Provides default configuration for IBKR Gateway connections
 */

export interface IBKRGatewayConfig {
  /** Gateway port (default: 5001) */
  gatewayPort: number;
  /** Gateway host (default: localhost) */
  gatewayHost: string;
  /** API base path (default: /v1/api) */
  apiBasePath: string;
  /** Request timeout in milliseconds (default: 10000) */
  timeout: number;
  /** Whether to reject unauthorized certificates (default: false for IBKR self-signed certs) */
  rejectUnauthorized: boolean;
}

/**
 * Default configuration values
 * Can be overridden via environment variables or method parameters
 */
export const defaultConfig: IBKRGatewayConfig = {
  gatewayPort: parseInt(process.env.IBKR_GATEWAY_PORT || '5001', 10),
  gatewayHost: process.env.IBKR_GATEWAY_HOST || 'localhost',
  apiBasePath: process.env.IBKR_API_BASE_PATH || '/v1/api',
  timeout: parseInt(process.env.IBKR_CLIENT_TIMEOUT || '10000', 10),
  rejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED === '1'
};

/**
 * Get the gateway base URL
 * @param config Optional config overrides
 */
export function getGatewayUrl(config?: Partial<IBKRGatewayConfig>): string {
  const cfg = { ...defaultConfig, ...config };
  return `https://${cfg.gatewayHost}:${cfg.gatewayPort}`;
}

/**
 * Get the full API URL
 * @param config Optional config overrides
 */
export function getApiUrl(config?: Partial<IBKRGatewayConfig>): string {
  const cfg = { ...defaultConfig, ...config };
  return `${getGatewayUrl(config)}${cfg.apiBasePath}`;
}