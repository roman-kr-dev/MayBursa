import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load from root .env.local only
dotenvConfig({ path: path.resolve(__dirname, '../../../../../.env.local') });

export type TradingMode = 'paper' | 'production';

interface Config {
  IBKR_GATEWAY_PORT: number;
  IBKR_CONTROL_PANEL_PORT: number;
  IBKR_CLIENTPORTAL_PATH: string;
  IBKR_USERNAME: string;
  IBKR_PASSWORD: string;
  IBKR_TRADING_MODE: TradingMode;
  NODE_TLS_REJECT_UNAUTHORIZED: string;
}

function validateEnv(): Config {
  const requiredVars = ['IBKR_USERNAME', 'IBKR_PASSWORD'];
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Validate trading mode
  const tradingMode = (process.env.IBKR_TRADING_MODE || 'paper').toLowerCase() as TradingMode;
  if (tradingMode !== 'paper' && tradingMode !== 'production') {
    throw new Error(`Invalid IBKR_TRADING_MODE: ${tradingMode}. Must be 'paper' or 'production'`);
  }

  // Show warning for production mode
  if (tradingMode === 'production') {
    console.warn('\n⚠️  WARNING: Running in PRODUCTION mode with REAL MONEY! ⚠️\n');
  }

  return {
    IBKR_GATEWAY_PORT: parseInt(process.env.IBKR_GATEWAY_PORT || '5001', 10),
    IBKR_CONTROL_PANEL_PORT: parseInt(process.env.IBKR_CONTROL_PANEL_PORT || '3000', 10),
    IBKR_CLIENTPORTAL_PATH: process.env.IBKR_CLIENTPORTAL_PATH || './clientportal.gw',
    IBKR_USERNAME: process.env.IBKR_USERNAME!,
    IBKR_PASSWORD: process.env.IBKR_PASSWORD!,
    IBKR_TRADING_MODE: tradingMode,
    NODE_TLS_REJECT_UNAUTHORIZED: process.env.NODE_TLS_REJECT_UNAUTHORIZED || '0'
  };
}

export const config = validateEnv();
export const environment = config; // alias for easier imports

export function getTradingMode(): TradingMode {
  return config.IBKR_TRADING_MODE;
}