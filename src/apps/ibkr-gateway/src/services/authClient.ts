import { IBKRClient } from '@monorepo/ibkr-client';

// Authentication Response Types
export interface AuthStatusResponse {
  authenticated: boolean;
  connected: boolean;
  competing: boolean;
  fail?: string;
  message?: string;
  MAC?: string;
  serverInfo?: {
    serverName?: string;
    serverVersion?: string;
  };
}

export interface TickleResponse {
  session?: string;
  ssoExpires?: number;
  collission?: boolean;
  userId?: number;
  iserver?: {
    authStatus?: {
      authenticated: boolean;
      competing: boolean;
      connected: boolean;
    };
  };
}

export interface SSOValidationResponse {
  USER_ID: number;
  USER_NAME: string;
  RESULT: boolean;
  AUTH_TIME: number;
  EXPIRES?: number;
  lastAccessed?: number;
  LOGIN_TYPE?: string;
  features?: Record<string, any>;
}

export interface ReauthResponse {
  message: string;
}

export interface LogoutResponse {
  status: boolean;
}

export interface SSOInitRequest {
  username?: string;
  token?: string;
  compete?: boolean;
}

export interface SSOInitResponse extends AuthStatusResponse {
  // Inherits all properties from AuthStatusResponse
}

/**
 * IBKR Authentication Client
 * Extends IBKRClient with authentication-specific methods
 */
export class AuthClient extends IBKRClient {

  /**
   * Check the current authentication status with IBKR Gateway
   * @returns Authentication status including connected, authenticated, and competing session info
   * @example
   * const status = await authClient.checkAuthStatus();
   * if (status.authenticated && status.connected && !status.competing) {
   *   // Session is valid
   * }
   */
  async checkAuthStatus(): Promise<AuthStatusResponse> {
    return this.getHttpClient().post<AuthStatusResponse>('/iserver/auth/status');
  }

  /**
   * Send a keep-alive signal to prevent session timeout
   * @description Prevents the gateway session from timing out after inactivity.
   * Should be called periodically (every 1-5 minutes) to maintain an active session.
   * @returns Response indicating if the tickle was successful
   * @example
   * // Call every 1 minute to keep session alive
   * setInterval(() => authClient.tickle(), 60000);
   */
  async tickle(): Promise<TickleResponse> {
    return this.getHttpClient().post<TickleResponse>('/tickle');
  }

  /**
   * Validate the current SSO (Single Sign-On) session
   * @description Validates the SSO session and returns detailed user information
   * including permissions, features, and session expiry details
   * @returns SSO validation details with user info
   * @example
   * const ssoInfo = await authClient.validateSSO();
   * console.log(`Session expires: ${ssoInfo.EXPIRES}`);
   */
  async validateSSO(): Promise<SSOValidationResponse> {
    return this.getHttpClient().get<SSOValidationResponse>('/sso/validate');
  }

  /**
   * Re-authenticate the current brokerage session
   * @description Attempts to re-authenticate using existing session credentials.
   * Useful when session is still valid but authentication has expired.
   * @returns Response indicating if re-authentication was triggered
   * @example
   * if (!status.authenticated) {
   *   await authClient.reauthenticate();
   *   // Wait and check status again
   * }
   */
  async reauthenticate(): Promise<ReauthResponse> {
    return this.getHttpClient().post<ReauthResponse>('/iserver/reauthenticate');
  }

  /**
   * Logout from the current IBKR Gateway session
   * @description Terminates the current session. Any further API calls will require re-authentication.
   * @returns Confirmation of logout success
   * @example
   * await authClient.logout();
   * // User must login again for any further operations
   */
  async logout(): Promise<LogoutResponse> {
    return this.getHttpClient().post<LogoutResponse>('/logout');
  }

  /**
   * Initialize SSO session for brokerage authentication
   * @description After retrieving access token and Live Session Token, 
   * initialize the brokerage session with credentials
   * @param credentials - Authentication credentials including tokens
   * @returns Session initialization response with auth status
   * @example
   * const response = await authClient.initSSO({
   *   username: 'user123',
   *   token: 'live_session_token'
   * });
   */
  async initSSO(credentials: SSOInitRequest): Promise<SSOInitResponse> {
    return this.getHttpClient().post<SSOInitResponse>('/iserver/auth/ssodh/init', credentials);
  }
}

// Export singleton instance for backward compatibility
export const authClient = new AuthClient();