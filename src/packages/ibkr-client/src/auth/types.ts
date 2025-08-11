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