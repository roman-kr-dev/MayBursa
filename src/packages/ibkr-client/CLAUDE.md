# IBKR Client Package Development Guidelines

## Overview
The `@monorepo/ibkr-client` package provides a unified interface for all Interactive Brokers Gateway communications. This package encapsulates authentication, gateway health checks, and base client functionality.

## Architecture

### Module Organization
```
src/packages/ibkr-client/
├── src/
│   ├── auth/              # Authentication functionality
│   │   ├── types.ts       # Auth-related TypeScript interfaces
│   │   ├── functions.ts   # IBKRAuth static class
│   │   └── index.ts       # Auth module exports
│   ├── gateway/           # Gateway health and connection checks
│   │   ├── types.ts       # Gateway-related interfaces
│   │   ├── functions.ts   # IBKRGateway static class
│   │   └── index.ts       # Gateway module exports
│   ├── config/            # Configuration
│   │   └── environment.ts # Gateway configuration and defaults
│   ├── IBKRClient.ts      # Base client class
│   └── index.ts           # Package exports
```

## Core Components

### IBKRClient (Base Client)
- **Purpose**: Provides the foundation for all IBKR communications
- **Base URL**: `https://localhost:5001` (without `/v1/api` suffix for flexibility)
- **Features**:
  - HTTPS agent configured for self-signed certificates
  - Circuit breaker pattern for resilience
  - Retry logic with exponential backoff
  - Request metrics and monitoring

### IBKRAuth (Authentication)
- **Purpose**: Static class for all authentication operations
- **Methods**:
  - `checkAuthStatus()` - Check authentication status
  - `tickle()` - Keep session alive
  - `validateSSO()` - Validate SSO session
  - `reauthenticate()` - Re-authenticate session
  - `logout()` - Terminate session
  - `initSSO()` - Initialize SSO session
- **Important**: All methods add `/v1/api` prefix to endpoints

### IBKRGateway (Gateway Operations)
- **Purpose**: Static class for gateway health and connection checks
- **Methods**:
  - `checkConnection()` - Check if gateway process is running
  - `checkApiAvailability()` - Check if API is responding
  - `getGatewayStatus()` - Get complete status
  - `waitForConnection()` - Wait for gateway with timeout
  - `waitForApiAvailability()` - Wait for API with timeout
  - `performHealthCheck()` - Complete health check
- **Note**: Uses IBKRClient internally for consistency

## Development Rules

### 1. URL Management
- **Base URL**: Always use `https://localhost:5001` as base
- **API Endpoints**: Add `/v1/api` prefix for API calls
- **Non-API Endpoints**: Call directly without prefix (e.g., `/` for health check)

### 2. Client Usage
- **Single Client**: Always use IBKRClient for all HTTP operations
- **No Direct Axios**: Never create separate axios instances
- **Configuration**: Pass port/host via IBKRClientConfig if needed

### 3. Error Handling
- Use `HttpApiError` from `@monorepo/shared-utils` for API errors
- Log errors with appropriate levels using logger from shared-utils
- Let the HttpClient's circuit breaker handle transient failures

### 4. Static Classes
- Both `IBKRAuth` and `IBKRGateway` are static classes
- Each method creates its own IBKRClient instance for isolation
- No singleton patterns - better for testing and concurrency

## Usage Examples

### Authentication
```typescript
import { IBKRAuth } from '@monorepo/ibkr-client';

// Check auth status
const status = await IBKRAuth.checkAuthStatus();
if (status.authenticated && status.connected && !status.competing) {
  // Session is valid
}

// Keep session alive
setInterval(() => IBKRAuth.tickle(), 60000);
```

### Gateway Health Check
```typescript
import { IBKRGateway } from '@monorepo/ibkr-client';

// Check gateway connection
const isConnected = await IBKRGateway.checkConnection(5001);

// Wait for gateway to be ready
await IBKRGateway.waitForConnection(60000, 5001);

// Perform complete health check
const health = await IBKRGateway.performHealthCheck();
console.log(`Gateway: ${health.gateway}, API: ${health.api}`);
```

### Custom Client Configuration
```typescript
import { IBKRClient } from '@monorepo/ibkr-client';

// Create client with custom configuration
const client = new IBKRClient({
  baseURL: 'https://custom-host:5001',
  timeout: 15000
});
```

## Testing Considerations

1. **Mock IBKRClient**: Mock the base client for unit tests
2. **Integration Tests**: Test against actual gateway in paper trading mode
3. **Timeout Handling**: Test timeout scenarios for wait methods
4. **Error Scenarios**: Test circuit breaker behavior

## Environment Variables

The package respects these environment variables:
- `IBKR_GATEWAY_PORT` - Gateway port (default: 5001)
- `IBKR_GATEWAY_HOST` - Gateway host (default: localhost)
- `IBKR_API_BASE_PATH` - API base path (default: /v1/api)
- `IBKR_CLIENT_TIMEOUT` - Request timeout in ms (default: 10000)
- `NODE_TLS_REJECT_UNAUTHORIZED` - Set to '1' to reject unauthorized certificates

## Important Notes

- **Never** hardcode credentials in this package
- **Always** use the shared logger from `@monorepo/shared-utils`
- **Maintain** backward compatibility when updating exports
- **Document** any breaking changes in commit messages