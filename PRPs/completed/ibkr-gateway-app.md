# PRP: Create IBKR ClientPortal.gw Manager

## Goal

Create a new Node.js service that manages the Interactive Brokers ClientPortal Gateway (clientportal.gw) lifecycle and handles automated authentication, enabling other Node.js applications to communicate with IBKR's REST API through the gateway.

### Primary Objectives:
1. **Start/Stop Management**: Reliably start and stop the Java-based clientportal.gw process
2. **Automated Authentication**: Use Puppeteer to automatically log in to IBKR through the gateway's web interface
3. **Health Monitoring**: Provide health check endpoints to verify the gateway is running and authenticated
4. **Process Isolation**: Run as a standalone service that other apps can depend on
5. **Zero API Implementation**: Do NOT implement any IBKR API calls beyond authentication - let consuming applications handle that

### Success Criteria:
- Gateway starts and automatically authenticates without manual intervention
- Other Node.js apps can verify the gateway is running and authenticated
- The gateway remains running independently of the management service
- Clean startup/shutdown with proper process cleanup
- Clear status reporting for debugging connection issues

### Out of Scope:
- Any trading, market data, or account API implementations
- Request proxying or middleware functionality
- WebSocket connections or streaming data
- API calls beyond those needed for authentication and connection status

## Context

```yaml
context:
  docs:
    - name: "ClientPortal Gateway"
      location: "./clientportal.gw/"
      focus: "Java-based REST API gateway for IBKR that we'll manage"
    
    - name: "IBKR Web API Documentation"
      url: "https://www.interactivebrokers.com/campus/ibkr-api-page/web-api"
      focus: "Reference for understanding authentication endpoints only"

  requirements:
    - Java 1.8+ runtime environment
    - ClientPortal.gw distribution from IBKR
    - Valid IBKR account credentials
    - Node.js 18+ for the management service

  architecture:
    - Gateway runs on port 5001 with self-signed SSL certificate
    - Authentication via web interface at https://localhost:5001
    - REST API available after authentication
    - Our service manages the process and auth, nothing more
```

## Phase 1: Project Setup

### Task 1.1: Initialize New Project
ACTION Create new ibkr-gateway app structure:
  - CREATE: src/apps/ibkr-gateway/package.json
  - CREATE: src/apps/ibkr-gateway/tsconfig.json
  - CREATE: src/apps/ibkr-gateway/src/index.ts
  - CREATE: src/apps/ibkr-gateway/README.md
  - VALIDATE: Ensure project follows monorepo structure
  - IF_FAIL: Check monorepo configuration

### Task 1.2: Update Root Environment Configuration
ACTION .env.local (in root folder):
  - ADD: IBKR_GATEWAY_PORT (default: 5001)
  - ADD: IBKR_CONTROL_PANEL_PORT (default: 3000)
  - ADD: IBKR_CLIENTPORTAL_PATH (default: './clientportal.gw')
  - ADD: IBKR_USERNAME (required)
  - ADD: IBKR_PASSWORD (required)
  - ADD: NODE_TLS_REJECT_UNAUTHORIZED for dev
  - VALIDATE: Variables are accessible from ibkr-gateway app

### Task 1.2a: Create Environment Configuration Module
ACTION src/apps/ibkr-gateway/src/config/environment.ts:
  - CREATE: Configuration module to read from root .env.local
  - IMPLEMENT: Configure dotenv to read from root directory:
    ```typescript
    import { config } from 'dotenv';
    import path from 'path';
    
    // Load from root .env.local only
    config({ path: path.resolve(__dirname, '../../../../.env.local') });
    ```
  - IMPLEMENT: Read environment variables with IBKR_ prefix
  - IMPLEMENT: Include IBKR_CONTROL_PANEL_PORT with default 3000
  - IMPLEMENT: Validation for required variables
  - NOTE: Only .env.local will be used for configuration
  - VALIDATE: Test configuration loading from root .env.local

### Task 1.3: Setup Package Dependencies
ACTION src/apps/ibkr-gateway/package.json:
  - CHECK: Verify if express, puppeteer, winston, TypeScript are already installed
  - ADD: axios for HTTP requests (if not present)
  - ADD: dotenv for environment variables (if not present)
  - CREATE: "dev" script that starts server with UI and auto-starts gateway:
    ```json
    "scripts": {
      "dev": "ts-node-dev src/index.ts"
    }
    ```
  - VALIDATE: Run pnpm install
  - NOTE: If any other dependencies are missing, ask before adding

## Phase 2: Core Services Implementation

### Task 2.1: Create ClientPortal Process Manager
ACTION src/apps/ibkr-gateway/src/services/clientPortalManager.ts:
  - CREATE: Service to manage clientportal.gw Java process
  - IMPLEMENT: checkJavaInstallation() method
  - IMPLEMENT: killExistingGateway() to terminate any running IBKR processes
  - IMPLEMENT: startGateway() method using spawn('bin/run.sh', [absolutePathToConfig])
    - First calls killExistingGateway()
    - Then starts new process
  - IMPLEMENT: stopGateway() with graceful shutdown
  - IMPLEMENT: isRunning() to check process status
  - IMPLEMENT: Process output logging
  - IMPLEMENT: PID file management
  - VALIDATE: Test process lifecycle

### Task 2.2: Create Login Automation Service
ACTION src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - CREATE: Puppeteer-based authentication service
  - IMPLEMENT: navigateToLogin() for https://localhost:5001
  - IMPLEMENT: acceptCertificate() for self-signed cert
  - IMPLEMENT: fillCredentials() with username/password
  - IMPLEMENT: handle2FA() if required
  - IMPLEMENT: verifyAuthentication() to confirm success
  - IMPLEMENT: Screenshot capture on failure
  - VALIDATE: Test with real credentials

### Task 2.3: Create Authentication Status Service
ACTION src/apps/ibkr-gateway/src/services/authStatus.ts:
  - CREATE: Service to monitor authentication state
  - IMPLEMENT: checkAuthStatus() via API endpoint
  - IMPLEMENT: isSessionValid() for session checking
  - IMPLEMENT: getSessionInfo() for details
  - IMPLEMENT: Session expiry tracking
  - VALIDATE: Test auth status detection

### Task 2.4: Create Connection Status Service
ACTION src/apps/ibkr-gateway/src/services/connectionStatus.ts:
  - CREATE: Service for gateway health checks
  - IMPLEMENT: checkConnection() to https://localhost:5001
  - IMPLEMENT: Custom HTTPS agent for self-signed cert
  - IMPLEMENT: getGatewayStatus() combined check
  - IMPLEMENT: Retry logic with exponential backoff
  - VALIDATE: Test with running gateway

### Task 2.5: Create Authentication Monitor Service
ACTION src/apps/ibkr-gateway/src/services/authMonitor.ts:
  - CREATE: Service to continuously monitor authentication status
  - IMPLEMENT: startMonitoring() method that runs every 10 seconds
  - IMPLEMENT: Check if API is available via connection status
  - IMPLEMENT: If API unavailable, trigger re-authentication:
    - Maximum 3 attempts
    - 30-second delay between attempts
    - Stop trying after 3 failures
  - IMPLEMENT: resetRetryCount() when manually triggered
  - IMPLEMENT: getMonitorStatus() to show current state
  - ADD: Logging for all authentication attempts
  - VALIDATE: Test automatic re-authentication

## Phase 3: API Layer

### Task 3.1: Create Express Server with Auto-Start
ACTION src/apps/ibkr-gateway/src/server.ts:
  - CREATE: Express application setup
  - IMPLEMENT: Use IBKR_CONTROL_PANEL_PORT from environment (default 3000)
  - IMPLEMENT: Middleware configuration
  - IMPLEMENT: Error handling middleware
  - IMPLEMENT: Request logging
  - IMPLEMENT: CORS configuration
  - IMPLEMENT: Auto-start sequence on server initialization:
    ```typescript
    async function initializeGateway() {
      // Kill any existing gateway processes
      await clientPortalManager.killExistingGateway();
      // Start the gateway
      await clientPortalManager.startGateway();
      // Wait for gateway to be ready
      await connectionStatus.waitForConnection();
      // Trigger authentication
      await loginAutomation.authenticate();
      // Start authentication monitoring
      await authMonitor.startMonitoring();
    }
    ```
  - IMPLEMENT: Call initializeGateway() when server starts
  - VALIDATE: Server starts with gateway running, authenticated, and monitored

### Task 3.2: Create API Routes
ACTION src/apps/ibkr-gateway/src/api/routes.ts:
  - CREATE: Route definitions
  - IMPLEMENT: GET /api/health - basic health check
  - IMPLEMENT: GET /api/status - gateway status
  - IMPLEMENT: GET /api/auth/status - auth status
  - IMPLEMENT: GET /api/auth/monitor - monitor status (retry count, last attempt)
  - IMPLEMENT: POST /api/gateway/start - start gateway (kills existing first)
  - IMPLEMENT: POST /api/gateway/stop - stop gateway
  - IMPLEMENT: POST /api/gateway/restart - restart gateway (stop + start + auth)
  - IMPLEMENT: POST /api/auth/login - trigger auth (resets retry count)
  - VALIDATE: Test all endpoints

### Task 3.3: Create Route Controllers
ACTION src/apps/ibkr-gateway/src/controllers/:
  - CREATE: gatewayController.ts for process control
  - CREATE: authController.ts for authentication
  - CREATE: statusController.ts for status checks
  - IMPLEMENT: Return PID when process is running
  - IMPLEMENT: Return auth status with API availability
  - IMPLEMENT: Proper error responses
  - IMPLEMENT: Async error handling
  - VALIDATE: Test error scenarios

## Phase 4: Control Panel UI

### Task 4.1: Create Control Panel HTML
ACTION src/apps/ibkr-gateway/src/public/index.html:
  - CREATE: Main control panel HTML page
  - IMPLEMENT: Bootstrap or Tailwind CSS for styling
  - CREATE: Process status card with prominent PID display
    - Large font for PID number
    - Clear label "Process ID (PID):"
    - Green background when running
    - Show "Not Running" when stopped
  - CREATE: Login status card with API availability
    - Show authentication state
    - Show retry attempts if re-authenticating
    - Show "Given up after 3 attempts" if failed
  - CREATE: Action buttons section
  - ADD: Auto-refresh status indicators
  - VALIDATE: Page loads correctly

### Task 4.2: Create Control Panel JavaScript
ACTION src/apps/ibkr-gateway/src/public/js/control-panel.js:
  - CREATE: Client-side JavaScript for control panel
  - IMPLEMENT: fetchProcessStatus() - checks if gateway is running
  - IMPLEMENT: fetchLoginStatus() - checks auth and API status
  - IMPLEMENT: fetchMonitorStatus() - shows retry attempts
  - IMPLEMENT: startProcess() - starts the gateway (kills existing first)
  - IMPLEMENT: killProcess() - stops the gateway
  - IMPLEMENT: restartProcess() - full restart with auth
  - IMPLEMENT: triggerLogin() - initiates authentication (resets monitor)
  - IMPLEMENT: Auto-refresh every 10 seconds using setInterval (polling)
  - IMPLEMENT: UI updates with status changes
  - IMPLEMENT: Show authentication retry status in UI
  - IMPLEMENT: Button state management (enable/disable)
  - ADD: "Restart Gateway" button functionality
  - ADD: Error handling and user notifications
  - VALIDATE: All functions work correctly

### Task 4.3: Create Control Panel Styles
ACTION src/apps/ibkr-gateway/src/public/css/control-panel.css:
  - CREATE: Custom styles for control panel
  - STYLE: Status cards with clear visual indicators
  - STYLE: PID display with large, bold font (e.g., font-size: 24px)
  - STYLE: Green/red status lights for running/stopped
  - STYLE: Loading spinners during operations
  - STYLE: Responsive layout for different screens
  - VALIDATE: UI looks professional and PID is prominently visible

### Task 4.4: Update Express Server for Static Files
ACTION src/apps/ibkr-gateway/src/server.ts:
  - ADD: Static file serving for public directory
  - ADD: Route for control panel at root path '/'
  - CONFIGURE: Proper MIME types
  - VALIDATE: Control panel accessible at http://localhost:${IBKR_CONTROL_PANEL_PORT}

## Phase 5: Process Management Scripts

### Task 5.1: Create CLI Management Script
ACTION src/apps/ibkr-gateway/scripts/gateway-cli.js:
  - CREATE: Command-line interface for gateway
  - IMPLEMENT: start command
  - IMPLEMENT: stop command
  - IMPLEMENT: status command
  - IMPLEMENT: restart command
  - IMPLEMENT: logs command
  - VALIDATE: Test all commands

### Task 5.2: Add NPM Scripts
ACTION Update package.json scripts:
  - ADD: "dev:ibkr-gateway": "turbo run dev --filter=@maybursa/ibkr-gateway"
  - This script will run both the server and serve the UI
  - VALIDATE: Script starts the complete application

## Phase 6: Testing and Documentation

### Task 6.1: Create Unit Tests
ACTION src/apps/ibkr-gateway/src/__tests__/:
  - CREATE: Unit tests for each service
  - TEST: Process manager lifecycle
  - TEST: Authentication flow
  - TEST: Status checking
  - TEST: API endpoints
  - VALIDATE: Achieve >80% coverage

### Task 6.2: Create Integration Tests
ACTION src/apps/ibkr-gateway/src/__tests__/integration/:
  - CREATE: End-to-end test suite
  - TEST: Full startup sequence
  - TEST: Authentication success/failure
  - TEST: API response contracts
  - VALIDATE: Tests pass reliably

### Task 6.3: Create Documentation
ACTION src/apps/ibkr-gateway/README.md:
  - DOCUMENT: Installation prerequisites
  - DOCUMENT: How to obtain clientportal.gw
  - DOCUMENT: Configuration setup
  - DOCUMENT: Control panel usage guide
  - DOCUMENT: API endpoint reference
  - DOCUMENT: Usage examples
  - DOCUMENT: Troubleshooting guide
  - VALIDATE: Documentation is clear

## Phase 7: Configuration Templates

### Task 7.1: Create Gateway Configuration
ACTION src/apps/ibkr-gateway/conf-custom.yaml:
  - COPY: clientportal.gw/root/conf.yaml to src/apps/ibkr-gateway/conf-custom.yaml
  - UPDATE: listenPort to 5001
  - UPDATE: listenHttps to true
  - KEEP: All other settings from template
  - DOCUMENT: Configuration changes made
  - UPDATE: clientPortalManager.ts to use this config path
  - VALIDATE: Gateway starts with new config

### Task 7.2: Update Root Environment Template
ACTION .env.example (in root folder):
  - UPDATE: Add IBKR-specific variables section (for .env.local reference)
  - ADD: IBKR_GATEWAY_PORT=5001
  - ADD: IBKR_CONTROL_PANEL_PORT=3000
  - ADD: IBKR_CLIENTPORTAL_PATH=./clientportal.gw
  - ADD: IBKR_USERNAME=your_username
  - ADD: IBKR_PASSWORD=your_password
  - ADD: NODE_TLS_REJECT_UNAUTHORIZED=0 (for dev)
  - DOCUMENT: Each IBKR variable's purpose
  - NOTE: These should be added to .env.local, not .env
  - VALIDATE: Works when values are filled in .env.local

### Task 7.3: Create Revert PRP
ACTION Create ibkr-gateway-app-revert.md:
  - CREATE: New PRP file with exact revert instructions
  - LIST: All files created by this PRP
  - LIST: All files modified by this PRP
  - PROVIDE: Step-by-step deletion/restoration commands
  - INCLUDE: How to remove conf-custom.yaml
  - INCLUDE: How to remove environment variables from root .env.local
  - INCLUDE: How to uninstall added dependencies
  - VALIDATE: Revert instructions are complete

## Validation Strategy

1. **Component Tests**: Test each service in isolation
2. **Integration Tests**: Test service interactions
3. **Manual Testing**: Full flow with real gateway
4. **Load Testing**: Ensure gateway remains stable
5. **Security Review**: Check credential handling

## Control Panel Features
1.	Active Process Check
	•	Show whether a detached Interactive Brokers process is currently running.
	•	If it is, display the PID and provide "Kill Process" and "Restart Gateway" buttons.
	•	This status should auto-refresh every 10 seconds using simple polling.
	2.	Login Status Check
	•	Show whether the process is logged in and whether the API is available.
	•	This status should also auto-refresh every 10 seconds using simple polling.
	3.	Manual Control Buttons
	•	"Start Gateway" button when process is not running
	•	"Kill Process" button when process is running
	•	"Restart Gateway" button to perform full restart with authentication
	•	"Manual Login" button to trigger authentication

## Success Criteria

### Core Functionality
- [ ] New ibkr-gateway app created in monorepo
- [ ] Existing gateway processes are killed before starting new ones
- [ ] ClientPortal.gw auto-starts when dev server runs
- [ ] Puppeteer automatically authenticates after gateway starts
- [ ] Authentication status is trackable
- [ ] Process management works reliably
- [ ] All API endpoints functioning
- [ ] No trading functionality implemented

### UI & Control Panel
- [ ] Control panel UI displays process status with PID
- [ ] Control panel shows login and API availability status
- [ ] Auto-refresh updates status every 10 seconds using polling
- [ ] Start/Kill/Restart buttons work correctly
- [ ] Manual login button triggers authentication
- [ ] UI shows current retry status

### Authentication & Monitoring
- [ ] Authentication monitor checks API every 10 seconds
- [ ] Auto re-authentication attempts up to 3 times
- [ ] 30-second delay between authentication attempts
- [ ] Monitor stops after 3 failed attempts
- [ ] Manual login resets the retry counter

### Environment & Configuration
- [ ] Environment variables are properly loaded from root .env.local
- [ ] Control panel runs on configurable port (IBKR_CONTROL_PANEL_PORT)
- [ ] Custom gateway configuration (conf-custom.yaml) is used correctly

### Error Handling & Recovery
- [ ] Graceful handling when Java is not installed
- [ ] Clear error messages when credentials are invalid
- [ ] Recovery from network interruptions
- [ ] Proper cleanup of zombie processes

### Logging & Debugging
- [ ] All gateway output is captured and logged
- [ ] Failed authentication attempts are logged with screenshots
- [ ] API requests are logged for debugging

### Security
- [ ] Credentials are never logged or exposed in UI
- [ ] Self-signed certificate handling works correctly
- [ ] No sensitive data in error responses

### Development Experience
- [ ] Single command startup (`pnpm dev:ibkr-gateway`)
- [ ] Clear console output showing startup progress
- [ ] Revert PRP is created and complete

### Testing & Documentation
- [ ] Tests provide good coverage (>80% for unit tests)
- [ ] Documentation is comprehensive
- [ ] Other apps can use the authenticated gateway

## Architecture Decisions

1. **Separate Process**: Gateway runs as independent Java process
2. **Stateless Service**: No persistent state beyond process PID
3. **Simple API**: Minimal endpoints for status and control
4. **No Proxy**: Other apps connect directly to gateway
5. **Credential Security**: Environment variables, never logged
6. **Auto-Recovery**: Automatic re-authentication with retry limits

## Implementation Limits

This PRP explicitly EXCLUDES:
- Trading order placement
- Market data retrieval  
- Account information access
- WebSocket streaming
- Any IBKR API interaction beyond connection status

The implementation is LIMITED TO:
- Starting/stopping the gateway process
- Automated authentication via Puppeteer
- Checking if the gateway is running
- Verifying connection and authentication status
- Re-triggering authentication when needed
- Basic process management

## Notes

- Authentication is handled automatically via Puppeteer at startup
- Credentials should be stored securely in environment variables
- This is a gateway manager with authentication, not a trading system
- For actual trading functionality, consuming apps will use the authenticated gateway
- The gateway runs as a separate Java process managed by Node.js
- Session management ensures the gateway stays authenticated for other apps to use