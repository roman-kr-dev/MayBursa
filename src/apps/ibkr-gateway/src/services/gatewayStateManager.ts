import { getTradingMode, TradingMode } from '../config/environment';
import { logger } from '@monorepo/shared-utils';

export interface ProcessState {
  isRunning: boolean;
  pid: number | null;
  lastUpdated: Date;
}

export interface ConnectionState {
  isConnected: boolean;
  isApiAvailable: boolean;
  latency?: number;
  error?: string;
  lastUpdated: Date;
}

export interface AuthenticationState {
  isValid: boolean;
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  lastUpdated: Date;
}

export interface MonitorState {
  isMonitoring: boolean;
  processRunning: boolean;
  authRetryCount: number;
  authMaxRetries: number;
  authHasGivenUp: boolean;
  restartAttempts: number;
  totalRestarts: number;
  lastUpdated: Date;
}

export interface GatewayState {
  mode: TradingMode;
  process: ProcessState;
  connection: ConnectionState;
  authentication: AuthenticationState;
  monitor: MonitorState;
  lastFullUpdate: Date;
}

class GatewayStateManager {
  private state: GatewayState;
  private stateListeners: Set<(state: GatewayState) => void> = new Set();

  constructor() {
    const now = new Date();
    this.state = {
      mode: getTradingMode(),
      process: {
        isRunning: false,
        pid: null,
        lastUpdated: now
      },
      connection: {
        isConnected: false,
        isApiAvailable: false,
        lastUpdated: now
      },
      authentication: {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastUpdated: now
      },
      monitor: {
        isMonitoring: false,
        processRunning: false,
        authRetryCount: 0,
        authMaxRetries: 3,
        authHasGivenUp: false,
        restartAttempts: 0,
        totalRestarts: 0,
        lastUpdated: now
      },
      lastFullUpdate: now
    };
  }

  updateProcessState(state: Partial<ProcessState>): void {
    this.state.process = {
      ...this.state.process,
      ...state,
      lastUpdated: new Date()
    };
    this.notifyListeners();
    logger.debug('Process state updated:', this.state.process);
  }

  updateConnectionState(state: Partial<ConnectionState>): void {
    this.state.connection = {
      ...this.state.connection,
      ...state,
      lastUpdated: new Date()
    };
    this.notifyListeners();
    logger.debug('Connection state updated:', this.state.connection);
  }

  updateAuthenticationState(state: Partial<AuthenticationState>): void {
    this.state.authentication = {
      ...this.state.authentication,
      ...state,
      lastUpdated: new Date()
    };
    this.notifyListeners();
    logger.debug('Authentication state updated:', this.state.authentication);
  }

  updateMonitorState(state: Partial<MonitorState>): void {
    this.state.monitor = {
      ...this.state.monitor,
      ...state,
      lastUpdated: new Date()
    };
    this.notifyListeners();
    logger.debug('Monitor state updated:', this.state.monitor);
  }

  updateTradingMode(mode: TradingMode): void {
    this.state.mode = mode;
    this.notifyListeners();
    logger.info(`Trading mode updated to: ${mode}`);
  }

  markFullUpdate(): void {
    this.state.lastFullUpdate = new Date();
  }

  getState(): Readonly<GatewayState> {
    return { ...this.state };
  }

  getProcessState(): Readonly<ProcessState> {
    return { ...this.state.process };
  }

  getConnectionState(): Readonly<ConnectionState> {
    return { ...this.state.connection };
  }

  getAuthenticationState(): Readonly<AuthenticationState> {
    return { ...this.state.authentication };
  }

  getMonitorState(): Readonly<MonitorState> {
    return { ...this.state.monitor };
  }

  getTradingMode(): TradingMode {
    return this.state.mode;
  }

  getFormattedStatus() {
    const state = this.getState();
    return {
      success: true,
      mode: state.mode,
      warning: state.mode === 'production' ? 'Running in PRODUCTION mode' : null,
      process: {
        isRunning: state.process.isRunning,
        pid: state.process.pid
      },
      connection: {
        isConnected: state.connection.isConnected,
        isApiAvailable: state.connection.isApiAvailable,
        latency: state.connection.latency,
        lastChecked: state.connection.lastUpdated.toISOString()
      },
      authentication: {
        isValid: state.authentication.isValid,
        authenticated: state.authentication.authenticated,
        connected: state.authentication.connected,
        competing: state.authentication.competing,
        lastChecked: state.authentication.lastUpdated.toISOString()
      }
    };
  }

  addStateListener(listener: (state: GatewayState) => void): void {
    this.stateListeners.add(listener);
  }

  removeStateListener(listener: (state: GatewayState) => void): void {
    this.stateListeners.delete(listener);
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.stateListeners.forEach(listener => {
      try {
        listener(currentState);
      } catch (error) {
        logger.error('Error in state listener:', error);
      }
    });
  }

  reset(): void {
    const now = new Date();
    this.state = {
      mode: getTradingMode(),
      process: {
        isRunning: false,
        pid: null,
        lastUpdated: now
      },
      connection: {
        isConnected: false,
        isApiAvailable: false,
        lastUpdated: now
      },
      authentication: {
        isValid: false,
        authenticated: false,
        connected: false,
        competing: false,
        lastUpdated: now
      },
      monitor: {
        isMonitoring: false,
        processRunning: false,
        authRetryCount: 0,
        authMaxRetries: 3,
        authHasGivenUp: false,
        restartAttempts: 0,
        totalRestarts: 0,
        lastUpdated: now
      },
      lastFullUpdate: now
    };
    this.notifyListeners();
    logger.info('Gateway state reset');
  }
}

export const gatewayStateManager = new GatewayStateManager();