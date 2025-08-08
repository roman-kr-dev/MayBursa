# IBKR Gateway Development Guidelines

## Process Management Rules

### Always Kill Previous Instances
Every time the gateway server starts, it MUST kill all previous IBKR gateway instances before starting a new one. This is handled by `initializeGateway()` -> `clientPortalManager.startGateway()` -> `killExistingGateway()`. 

**Never bypass this flow or check if a process is "already running" to skip initialization.**

This ensures:
- Clean state on every server start
- No zombie processes  
- Predictable behavior
- Proper state management initialization

## Project Structure

### Core Files
- `src/index.ts` - Application entry point, starts Express server on port 3000
- `src/server.ts` - Express server setup, middleware configuration, and gateway initialization
- `src/config/environment.ts` - Environment variables and trading mode (paper/production) settings

### API Layer
- `src/api/routes.ts` - API route definitions and endpoint mapping
- `src/controllers/`
  - `gatewayController.ts` - Handles gateway start/stop/restart operations
  - `authController.ts` - Manages authentication, login triggers, and monitor status
  - `statusController.ts` - Returns cached gateway status (reads from state manager, no API calls)

### Service Layer
- `src/services/`
  - `gatewayStateManager.ts` - Centralized state management, maintains cached status for all components
  - `clientPortalManager.ts` - Manages gateway process lifecycle (start/stop/kill), Java process management
  - `connectionStatus.ts` - Checks gateway connection and API availability
  - `authStatus.ts` - Tracks authentication state and session validity
  - `gatewayMonitor.ts` - Runs every 10 seconds, updates state manager, handles auto-restart and re-auth
  - `loginAutomation.ts` - Automated login using Puppeteer browser automation
  - `apiClient.ts` - IBKR API client with retry logic, circuit breaker, and connection pooling

### Public Assets (Control Panel)
- `public/index.html` - Control panel UI for gateway management
- `public/js/control-panel.js` - Client-side logic, fetches status from `/api/status` endpoint

### Reference Documentation
- `reference/` - IBKR API documentation directory
  - `API-README.md` - Comprehensive IBKR API reference guide
  - `*.yaml` - OpenAPI specifications for various IBKR API endpoints

### Utilities
- `src/utils/errorUtils.ts` - Error handling and message extraction utilities
- `src/test-puppeteer.ts` - Puppeteer testing and debugging utilities

### Configuration Files
- `package.json` - Node.js dependencies and npm scripts
- `tsconfig.json` - TypeScript compiler configuration
- `CLAUDE.md` - This file, gateway-specific development guidelines