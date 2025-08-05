# IBKR Gateway Manager

A Node.js service that manages the Interactive Brokers ClientPortal Gateway (clientportal.gw) lifecycle with automated authentication.

## Table of Contents
- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Usage](#usage)
- [Architecture](#architecture)
- [API Reference](#api-reference)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Security](#security)
- [Development](#development)
- [Limitations](#limitations)

## Overview

This service provides:
- Automated starting/stopping of the IBKR ClientPortal Gateway
- Automated authentication using Puppeteer
- Health monitoring and status checks
- Web-based control panel UI
- REST API for gateway control
- Auto-recovery with retry logic for authentication

### Key Features
- **Zero Manual Intervention**: Gateway starts and authenticates automatically
- **Process Management**: Reliable start/stop with PID tracking
- **Authentication Monitoring**: Automatic re-authentication with configurable retries
- **Real-time Status**: Web UI with live updates every 10 seconds
- **RESTful API**: Full programmatic control of the gateway

## Prerequisites

- Node.js 18+ and pnpm
- Java 1.8+ (required for ClientPortal Gateway)
- IBKR ClientPortal Gateway distribution
- Valid IBKR account credentials
- Chrome/Chromium (for Puppeteer authentication)

### Obtaining ClientPortal Gateway

1. Visit [IBKR API page](https://www.interactivebrokers.com/en/trading/ib-api.php)
2. Download the "Client Portal Gateway" 
3. Extract to your project directory (e.g., `./clientportal.gw`)

## Installation

### 1. Clone and Setup
```bash
# Navigate to the monorepo root
cd /path/to/MayBursa

# Install dependencies
pnpm install
```

### 2. Configure Environment
Edit `.env.local` in the root directory:

```bash
# IBKR Configuration
IBKR_GATEWAY_PORT=5001
IBKR_CONTROL_PANEL_PORT=3000
IBKR_CLIENTPORTAL_PATH=./clientportal.gw
IBKR_USERNAME=your_username
IBKR_PASSWORD=your_password
NODE_TLS_REJECT_UNAUTHORIZED=0  # For development only
```

### 3. Verify Java Installation
```bash
java -version
# Should output: java version "1.8.x" or higher
```

## Quick Start

```bash
# Start the gateway manager with auto-start
pnpm dev:ibkr-gateway

# The service will:
# 1. Start on http://localhost:3000
# 2. Kill any existing gateway processes
# 3. Start the ClientPortal Gateway
# 4. Automatically authenticate
# 5. Begin monitoring authentication status
```

## Usage

### Control Panel UI

Access the web-based control panel at http://localhost:3000

#### UI Features:
- **Process Status Card**
  - Real-time process status (Running/Stopped)
  - Process ID (PID) display
  - API latency monitoring
  
- **Authentication Status Card**
  - Authentication state
  - API availability
  - Monitor status with retry count
  
- **Control Buttons**
  - Start Gateway - Starts the gateway process
  - Kill Process - Stops the gateway
  - Restart Gateway - Full restart with re-authentication
  - Manual Login - Triggers authentication and resets retry count

- **Activity Log**
  - Real-time event logging
  - Color-coded messages (success/error/warning/info)
  - Timestamp for each event

### API Endpoints

#### Status Endpoints

**Health Check**
```bash
GET /api/health
Response: { "status": "ok", "timestamp": "2025-08-03T..." }
```

**Gateway Status**
```bash
GET /api/status
Response: {
  "success": true,
  "mode": "paper",
  "warning": null,
  "process": {
    "isRunning": true,
    "pid": 12345
  },
  "connection": {
    "isConnected": true,
    "isApiAvailable": true,
    "latency": 45
  },
  "authentication": {
    "isValid": true,
    "authenticated": true,
    "connected": true
  }
}
```

**Authentication Status**
```bash
GET /api/auth/status
Response: {
  "success": true,
  "authenticated": true,
  "connected": true,
  "competing": false,
  "isValid": true,
  "tradingMode": "paper"
}
```

**Monitor Status**
```bash
GET /api/auth/monitor
Response: {
  "success": true,
  "isMonitoring": true,
  "retryCount": 0,
  "maxRetries": 3,
  "hasGivenUp": false
}
```

**Trading Mode**
```bash
GET /api/config/mode
Response: {
  "mode": "paper",
  "warning": null  // or "Running in PRODUCTION mode - REAL MONEY" for production
}
```

#### Control Endpoints

**Start Gateway**
```bash
POST /api/gateway/start
Response: {
  "success": true,
  "message": "Gateway started successfully",
  "pid": 12345
}
```

**Stop Gateway**
```bash
POST /api/gateway/stop
Response: {
  "success": true,
  "message": "Gateway stopped successfully"
}
```

**Restart Gateway**
```bash
POST /api/gateway/restart
Response: {
  "success": true,
  "message": "Gateway restarted successfully",
  "pid": 12346
}
```

**Trigger Login**
```bash
POST /api/auth/login
Response: {
  "success": true,
  "message": "Authentication successful"
}
```

## Architecture

### Service Components

1. **ClientPortal Manager** (`clientPortalManager.ts`)
   - Manages Java process lifecycle
   - Handles PID tracking
   - Ensures clean startup/shutdown

2. **Login Automation** (`loginAutomation.ts`)
   - Uses Puppeteer for browser automation
   - Handles form filling and submission
   - Captures screenshots on failure
   - Supports 2FA detection

3. **Authentication Status** (`authStatus.ts`)
   - Monitors session validity
   - Checks authentication state
   - Provides session information

4. **Connection Status** (`connectionStatus.ts`)
   - Monitors gateway availability
   - Implements retry logic with exponential backoff
   - Tracks API latency

5. **Authentication Monitor** (`authMonitor.ts`)
   - Runs every 10 seconds
   - Automatic re-authentication (max 3 attempts)
   - 30-second delay between attempts
   - Can be reset via manual login

### Directory Structure
```
src/apps/ibkr-gateway/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Express server setup
│   ├── config/
│   │   └── environment.ts    # Environment configuration
│   ├── services/
│   │   ├── clientPortalManager.ts
│   │   ├── loginAutomation.ts
│   │   ├── authStatus.ts
│   │   ├── connectionStatus.ts
│   │   └── authMonitor.ts
│   ├── controllers/
│   │   ├── gatewayController.ts
│   │   ├── authController.ts
│   │   └── statusController.ts
│   ├── api/
│   │   └── routes.ts
├── public/
│   ├── index.html
│   ├── js/
│   │   └── control-panel.js
│   └── css/
│       └── control-panel.css
├── clientportal.gw/          # Gateway distribution
│   └── root/
│       └── conf.yaml         # Native gateway configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Configuration

### Trading Modes

The gateway supports two trading modes to safely separate testing from live trading:

#### Paper Mode (Default)
- Uses simulated trading environment
- No real money involved
- No 2FA authentication required
- Safe for testing and development
- Default mode when `IBKR_TRADING_MODE` is not set

#### Production Mode
- **⚠️ WARNING: Uses REAL MONEY**
- Requires 2FA authentication
- Waits up to 120 seconds for 2FA completion
- Shows prominent warnings in UI and logs
- Requires explicit confirmation for all actions

#### Mode Configuration
Set the mode in `.env.local`:
```bash
# Trading Mode: 'paper' (default) or 'production'
# WARNING: Production mode uses real money and requires 2FA
IBKR_TRADING_MODE=paper  # Change to 'production' for live trading
```

#### Mode Indicators
- **UI Banner**: Prominent banner at top of control panel
  - Green for paper mode
  - Red pulsing animation for production mode
- **Status Cards**: Mode displayed in authentication status
- **Logs**: Clear mode indication on startup
- **API Responses**: Mode included in all status endpoints

### Environment Variables

All configuration is done through environment variables in the root `.env.local` file.

#### Required Variables
- `IBKR_USERNAME` - Your IBKR username
- `IBKR_PASSWORD` - Your IBKR password

#### Optional Variables
- `IBKR_GATEWAY_PORT` - Gateway port (default: 5001)
- `IBKR_CONTROL_PANEL_PORT` - Control panel port (default: 3000)
- `IBKR_CLIENTPORTAL_PATH` - Path to gateway (default: ./clientportal.gw)
- `IBKR_TRADING_MODE` - Trading mode: 'paper' or 'production' (default: paper)
- `IBKR_AUTO_LOGIN` - Enable automatic login: 'true' or 'false' (default: true)
- `NODE_TLS_REJECT_UNAUTHORIZED` - Set to 0 for development (self-signed certs)

### Gateway Configuration

The gateway uses the native configuration file at `clientportal.gw/root/conf.yaml`:
- Listen port: 5001
- SSL enabled with self-signed certificate
- CORS enabled for all origins
- Default IBKR API settings

Note: The gateway configuration is now using the native IBKR configuration file instead of a custom configuration. This ensures compatibility with IBKR updates and reduces maintenance overhead.

## Troubleshooting

### Common Issues

#### Gateway Won't Start
```bash
# Check Java installation
java -version

# Verify gateway files exist
ls -la ./clientportal.gw/bin/run.sh

# Check for port conflicts
lsof -i :5001

# Review logs
tail -f logs/combined.log
```

#### Authentication Fails
- Verify credentials in `.env.local`
- Check for 2FA requirements
- Review screenshots in `screenshots/` directory
- Ensure Chrome/Chromium is installed for Puppeteer

#### Connection Issues
```bash
# Test direct gateway connection
curl -k https://localhost:5001

# Check firewall settings
sudo ufw status

# Verify process is running
ps aux | grep clientportal
```

#### Monitor Gives Up
- The monitor stops after 3 failed attempts
- Use "Manual Login" button to reset and retry
- Check credentials and network connectivity

#### Mode-Specific Issues

**Paper Mode Authentication Fails**
- Verify you're using paper trading credentials
- Paper accounts have different usernames (often with suffix)
- Check IBKR account settings for paper trading access

**Production Mode 2FA Timeout**
- Ensure you complete 2FA within 120 seconds
- Check your authenticator app is synced
- Review screenshots for 2FA prompt detection

**Wrong Mode Active**
- Mode cannot be changed without restart
- Update `IBKR_TRADING_MODE` in `.env.local`
- Restart the gateway manager service

### Log Files
- Application logs: `logs/combined.log`
- Error logs: `logs/error.log`
- Gateway logs: `clientportal.gw/logs/`
- Screenshots: `screenshots/` (on auth failure)

## Security

### Best Practices
1. **Never commit `.env.local`** - Add to `.gitignore`
2. **Use strong passwords** - Enable 2FA on IBKR account
3. **Restrict network access** - Use firewall rules
4. **Production deployment** - Use proper SSL certificates

### Security Features
- Credentials stored in environment variables only
- No credentials logged or exposed in UI
- Self-signed certificate warnings handled
- Process isolation between gateway and manager

## Development

### Running in Development
```bash
# Start with hot-reload
pnpm dev:ibkr-gateway

# Run linting
pnpm lint

# Type checking
pnpm typecheck

# Build for production
pnpm build
```

### Testing
```bash
# Run unit tests (when implemented)
pnpm test

# Run integration tests
pnpm test:integration
```

### Debugging
1. Enable debug logging:
   ```bash
   LOG_LEVEL=debug pnpm dev:ibkr-gateway
   ```

2. Check browser automation:
   - Set `headless: false` in `loginAutomation.ts`
   - Watch the authentication process

3. Monitor network requests:
   ```bash
   # In another terminal
   tcpdump -i lo0 port 5001
   ```

4. Disable automatic login for manual testing:
   ```bash
   IBKR_AUTO_LOGIN=false pnpm dev:ibkr-gateway
   ```
   This allows you to test manual login flows and authentication monitoring without automatic interference.

## Limitations

This service is intentionally limited to gateway management and authentication only. 

### What it DOES NOT do:
- Trading functionality
- Market data access  
- Account information retrieval
- WebSocket streaming
- API request proxying
- Order management
- Portfolio analysis

### Design Philosophy
The service follows the Unix philosophy of "do one thing well". It manages the gateway lifecycle and authentication, allowing other specialized applications to handle specific trading functionality.

### Integration with Other Apps
Other applications should:
1. Check gateway status via this service's API
2. Connect directly to the authenticated gateway at https://localhost:5001
3. Use the IBKR REST API documentation for implementing trading logic

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review logs in `logs/` directory
3. Check IBKR ClientPortal Gateway documentation
4. File an issue in the repository

## License

This project is part of the MayBursa monorepo. See the root LICENSE file for details.