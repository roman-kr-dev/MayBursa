import { IBKRClient } from '../IBKRClient';
import {
  AuthStatusResponse,
  TickleResponse,
  SSOValidationResponse,
  ReauthResponse,
  LogoutResponse,
  SSOInitRequest,
  SSOInitResponse
} from './types';

/**
 * IBKR Authentication Service
 * Static class providing authentication methods for IBKR Gateway
 */
export class IBKRAuth {
  /**
   * Creates a new IBKRClient instance for auth operations
   * Each method creates its own client for better isolation
   */
  private static createClient(): IBKRClient {
    return new IBKRClient();
  }

  /**
   * Check the current authentication status with IBKR Gateway
   * @returns Authentication status including connected, authenticated, and competing session info
   * @example
   * const status = await IBKRAuth.checkAuthStatus();
   * if (status.authenticated && status.connected && !status.competing) {
   *   // Session is valid
   * }
   */
  static async checkAuthStatus(): Promise<AuthStatusResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().post<AuthStatusResponse>('/iserver/auth/status');
  }

  /**
   * Send a keep-alive signal to prevent session timeout
   * @description Prevents the gateway session from timing out after inactivity.
   * Should be called periodically (every 1-5 minutes) to maintain an active session.
   * @returns Response indicating if the tickle was successful
   * @example
   * // Call every 1 minute to keep session alive
   * setInterval(() => IBKRAuth.tickle(), 60000);
   */
  static async tickle(): Promise<TickleResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().post<TickleResponse>('/tickle');
  }

  /**
   * Validate the current SSO (Single Sign-On) session
   * @description Validates the SSO session and returns detailed user information
   * including permissions, features, and session expiry details
   * @returns SSO validation details with user info
   * @example
   * const ssoInfo = await IBKRAuth.validateSSO();
   * console.log(`Session expires: ${ssoInfo.EXPIRES}`);
   */
  static async validateSSO(): Promise<SSOValidationResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().get<SSOValidationResponse>('/sso/validate');
  }

  /**
   * Re-authenticate the current brokerage session
   * @description Attempts to re-authenticate using existing session credentials.
   * Useful when session is still valid but authentication has expired.
   * @returns Response indicating if re-authentication was triggered
   * @example
   * const status = await IBKRAuth.checkAuthStatus();
   * if (!status.authenticated) {
   *   await IBKRAuth.reauthenticate();
   *   // Wait and check status again
   * }
   */
  static async reauthenticate(): Promise<ReauthResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().post<ReauthResponse>('/iserver/reauthenticate');
  }

  /**
   * Logout from the current IBKR Gateway session
   * @description Terminates the current session. Any further API calls will require re-authentication.
   * @returns Confirmation of logout success
   * @example
   * await IBKRAuth.logout();
   * // User must login again for any further operations
   */
  static async logout(): Promise<LogoutResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().post<LogoutResponse>('/logout');
  }

  /**
   * Initialize SSO session for brokerage authentication
   * @description After retrieving access token and Live Session Token, 
   * initialize the brokerage session with credentials
   * @param credentials - Authentication credentials including tokens
   * @returns Session initialization response with auth status
   * @example
   * const response = await IBKRAuth.initSSO({
   *   username: 'user123',
   *   token: 'live_session_token'
   * });
   */
  static async initSSO(credentials: SSOInitRequest): Promise<SSOInitResponse> {
    const client = this.createClient();
    // @ts-ignore - accessing protected method for internal use
    return client.getHttpClient().post<SSOInitResponse>('/iserver/auth/ssodh/init', credentials);
  }
}