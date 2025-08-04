# PRP: Add Paper and Production Mode Support to IBKR Gateway

## Goal

Enhance the existing IBKR Gateway manager to support both paper (simulated) trading mode and production (live) trading mode, with appropriate handling of authentication differences between the two modes.

### Primary Objectives:
1. **Dual Mode Support**: Enable switching between paper and production modes via environment variable
2. **Differentiated Authentication**: Handle 2FA requirements differently based on mode
3. **Mode-Specific Configuration**: Adjust gateway behavior based on selected mode
4. **Clear Mode Indication**: Display current mode prominently in UI and logs
5. **Safe Defaults**: Default to paper mode to prevent accidental live trading

### Success Criteria:
- Gateway starts in paper mode by default unless explicitly configured
- Paper mode authentication bypasses 2FA wait
- Production mode properly waits for and handles 2FA
- Current mode is clearly visible in control panel
- Mode cannot be changed without gateway restart
- Clear warnings when running in production mode

## Context

```yaml
context:
  completed_work:
    - name: "Completed IBKR Gateway PRP"
      location: "PRPs/completed/ibkr-gateway-app.md"
      description: "Base implementation of gateway manager with authentication"
    
    - name: "IBKR Gateway README"
      location: "src/apps/ibkr-gateway/README.md"
      description: "Current documentation for the gateway manager"

  requirements:
    - Existing ibkr-gateway implementation
    - Understanding of IBKR paper vs production authentication
    - Paper accounts don't require 2FA
    - Production accounts require 2FA handling

  changes_needed:
    - Environment variable for mode selection
    - Modified authentication flow based on mode
    - UI updates to show current mode
    - Documentation updates
```

## Phase 1: Environment Configuration Updates

### Task 1.1: Add Trading Mode Environment Variable
ACTION Update src/apps/ibkr-gateway/src/config/environment.ts:
  - ADD: IBKR_TRADING_MODE environment variable
  - IMPLEMENT: Validation to ensure only 'paper' or 'production' values
  - DEFAULT: Set to 'paper' if not specified
  - ADD: Type definition for TradingMode: 'paper' | 'production'
  - IMPLEMENT: Export getTradingMode() helper function
  - ADD: Console warning when running in production mode
  - VALIDATE: Mode is correctly read from environment

### Task 1.2: Update Root Environment Configuration
ACTION Update .env.local and .env.example:
  - ADD: IBKR_TRADING_MODE=paper (with comment explaining options)
  - DOCUMENT: Difference between paper and production modes
  - ADD: Warning comment about production mode implications
  - EXAMPLE:
    ```
    # Trading Mode: 'paper' (default) or 'production'
    # WARNING: Production mode uses real money and requires 2FA
    IBKR_TRADING_MODE=paper
    ```
  - VALIDATE: Environment variable is accessible

## Phase 2: Authentication Service Modifications

### Task 2.1: Update Login Automation Service
ACTION Modify src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - IMPORT: getTradingMode from config/environment
  - MODIFY: authenticate() method to check trading mode
  - IMPLEMENT: Conditional 2FA handling:
    ```typescript
    const tradingMode = getTradingMode();
    
    if (tradingMode === 'production') {
      // Wait for 2FA with timeout
      await this.handle2FA(page);
    } else {
      // Skip 2FA wait for paper mode
      console.log('Paper mode: Skipping 2FA wait');
      // Add small delay to ensure login completes
      await page.waitForTimeout(3000);
    }
    ```
  - ADD: Logging to indicate which mode is being used
  - IMPLEMENT: Different timeout values for each mode
  - VALIDATE: Paper mode doesn't wait for 2FA

### Task 2.2: Enhance 2FA Handling
ACTION Update handle2FA() method in loginAutomation.ts:
  - IMPLEMENT: Configurable timeout based on mode
  - ADD: Production mode: 120 second timeout for 2FA
  - ADD: Paper mode: Skip or use 5 second timeout
  - IMPLEMENT: Better error messages indicating mode
  - ADD: Screenshot naming includes mode (e.g., 'auth-failure-production-[timestamp].png')
  - VALIDATE: 2FA handling works correctly for both modes

### Task 2.3: Update Authentication Status Service
ACTION Modify src/apps/ibkr-gateway/src/services/authStatus.ts:
  - ADD: Include trading mode in status response
  - IMPLEMENT: getFullStatus() method that returns:
    ```typescript
    {
      authenticated: boolean,
      sessionValid: boolean,
      tradingMode: 'paper' | 'production',
      apiAvailable: boolean,
      lastCheck: Date
    }
    ```
  - VALIDATE: Status correctly reports mode

## Phase 3: API Updates

### Task 3.1: Update Status Endpoints
ACTION Modify src/apps/ibkr-gateway/src/api/routes.ts:
  - UPDATE: GET /api/status to include trading mode
  - UPDATE: GET /api/auth/status to include mode-specific info
  - ADD: GET /api/config/mode endpoint to return current mode
  - IMPLEMENT: Response format:
    ```json
    {
      "status": "running",
      "mode": "paper",
      "warning": null | "Running in PRODUCTION mode"
    }
    ```
  - VALIDATE: All endpoints return mode information

### Task 3.2: Update Controllers
ACTION Modify src/apps/ibkr-gateway/src/controllers/statusController.ts:
  - IMPORT: getTradingMode from config
  - UPDATE: Status responses to include mode
  - ADD: Warning field when in production mode
  - IMPLEMENT: Color coding hints for UI (suggest red for production, green for paper)
  - VALIDATE: Controllers properly report mode

## Phase 4: UI Updates

### Task 4.1: Update Control Panel HTML
ACTION Modify src/apps/ibkr-gateway/src/public/index.html:
  - ADD: Mode indicator banner at top of page
  - IMPLEMENT: Color-coded mode display:
    - Paper mode: Green background with "PAPER MODE" text
    - Production mode: Red background with "PRODUCTION MODE - REAL MONEY" text
  - ADD: Mode information to status cards
  - ADD: Warning icon for production mode
  - STYLE: Make mode indicator prominent and always visible
  - VALIDATE: Mode is clearly visible

### Task 4.2: Update Control Panel JavaScript
ACTION Modify src/apps/ibkr-gateway/src/public/js/control-panel.js:
  - UPDATE: fetchStatus() to retrieve and display mode
  - IMPLEMENT: updateModeIndicator() function
  - ADD: Visual warnings for production mode
  - IMPLEMENT: Confirmation dialog for actions in production mode
  - ADD: Mode-specific styling:
    ```javascript
    if (mode === 'production') {
      modeIndicator.className = 'mode-indicator production';
      modeIndicator.innerHTML = '⚠️ PRODUCTION MODE - REAL MONEY';
    } else {
      modeIndicator.className = 'mode-indicator paper';
      modeIndicator.innerHTML = '📝 PAPER MODE - SIMULATED';
    }
    ```
  - VALIDATE: UI clearly indicates current mode

### Task 4.3: Update Control Panel Styles
ACTION Modify src/apps/ibkr-gateway/src/public/css/control-panel.css:
  - ADD: Styles for mode indicator banner
  - IMPLEMENT: Mode-specific color schemes:
    ```css
    .mode-indicator.paper {
      background: #28a745;
      color: white;
      padding: 10px;
      font-weight: bold;
    }
    
    .mode-indicator.production {
      background: #dc3545;
      color: white;
      padding: 10px;
      font-weight: bold;
      animation: pulse 2s infinite;
    }
    ```
  - ADD: Pulse animation for production mode
  - VALIDATE: Visual distinction is clear

## Phase 5: Server and Process Management Updates

### Task 5.1: Update Server Initialization
ACTION Modify src/apps/ibkr-gateway/src/server.ts:
  - IMPORT: getTradingMode from config
  - ADD: Mode logging on server start
  - IMPLEMENT: Console output with mode:
    ```typescript
    console.log('========================================');
    console.log(`Starting IBKR Gateway in ${tradingMode.toUpperCase()} MODE`);
    if (tradingMode === 'production') {
      console.log('⚠️  WARNING: Running in PRODUCTION mode with REAL MONEY');
    }
    console.log('========================================');
    ```
  - VALIDATE: Mode is clearly logged on startup

## Phase 6: Documentation Updates

### Task 6.1: Update Main README
ACTION Update src/apps/ibkr-gateway/README.md:
  - ADD: Section on Trading Modes
  - DOCUMENT: Differences between paper and production
  - ADD: Configuration examples for both modes
  - INCLUDE: Warning about production mode
  - ADD: Troubleshooting for mode-specific issues
  - EXAMPLE:
    ```markdown
    ## Trading Modes
    
    ### Paper Mode (Default)
    - Uses simulated trading environment
    - No real money involved
    - No 2FA required
    - Safe for testing
    
    ### Production Mode
    - **WARNING**: Uses real money
    - Requires 2FA authentication
    - Add to .env.local: `IBKR_TRADING_MODE=production`
    ```
  - VALIDATE: Documentation is clear

### Task 6.2: Update Environment Template
ACTION Update .env.example:
  - ADD: Detailed comments about trading modes
  - INCLUDE: Clear warnings about production mode
  - PROVIDE: Examples for both configurations
  - VALIDATE: Template properly documents the option

## Validation Strategy

1. **Mode Detection**: Verify correct mode is detected from environment
2. **Authentication Flow**: Test both paper and production auth flows manually
3. **UI Indication**: Ensure mode is clearly visible
4. **Documentation**: Confirm all changes are documented

## Success Criteria

- [ ] IBKR_TRADING_MODE environment variable is implemented
- [ ] Default mode is 'paper' when not specified
- [ ] Paper mode skips 2FA wait during authentication
- [ ] Production mode properly waits for 2FA
- [ ] Current mode is prominently displayed in control panel
- [ ] Mode indicator uses green for paper, red for production
- [ ] API endpoints return current mode information
- [ ] Server logs clearly show which mode is active
- [ ] Production mode shows warnings in UI and logs
- [ ] Documentation clearly explains both modes
- [ ] Screenshots include mode in filename
- [ ] Mode information included in all status responses

## Implementation Notes

- **Default Safety**: Always default to paper mode to prevent accidents
- **Clear Indication**: Mode should be impossible to miss in UI
- **2FA Timing**: Paper mode should wait max 5 seconds, production up to 120 seconds
- **Logging**: Every log should indicate current mode for debugging
- **Future Enhancement**: Consider separate credentials for paper vs production

## Rollback Plan

If issues arise:
1. Remove IBKR_TRADING_MODE from environment
2. Code defaults to paper mode (safe default)
3. Existing functionality continues to work
4. No breaking changes to current implementation