# PRP: Enable Puppeteer Debug Mode for IBKR Gateway

## Overview
Add environment variable control to toggle Puppeteer between headless and visible browser modes for debugging purposes.

## Context

```yaml
context:
  current_state:
    - file: src/apps/ibkr-gateway/src/services/loginAutomation.ts
      headless_config: "headless: 'new'" (line 52)
      browser_launch: launchBrowser() method (lines 50-74)
    
  patterns:
    - file: src/apps/ibkr-gateway/src/config/environment.ts
      copy: Environment variable pattern with defaults
    - file: .env.example
      copy: Environment variable documentation format
  
  dependencies:
    - puppeteer: Browser automation
    - config/environment.ts: Central env var management
    
  gotchas:
    - issue: "Puppeteer 'new' headless mode vs false"
      fix: "Use false for visible browser, 'new' for headless"
    - issue: "Browser window management in debug mode"
      fix: "Add window positioning options for better debugging"
```

## Tasks

### 1. Add Debug Environment Variable
**ACTION** .env.example:
  - OPERATION: Add IBKR_PUPPETEER_DEBUG_MODE variable documentation
  - VALIDATE: Check file syntax
  - LOCATION: After line 24, before closing comment
  - ADD:
    ```
    # Puppeteer Debug Mode: 'true' shows browser window, 'false' (default) runs headless
    # Use for debugging authentication issues or browser automation problems
    IBKR_PUPPETEER_DEBUG_MODE=false
    ```

### 2. Update Environment Configuration
**ACTION** src/apps/ibkr-gateway/src/config/environment.ts:
  - OPERATION: Add puppeteerDebugMode to config object
  - VALIDATE: npm run typecheck in ibkr-gateway
  - LOCATION: After tradingMode property (around line 16)
  - ADD:
    ```typescript
    puppeteerDebugMode: process.env.IBKR_PUPPETEER_DEBUG_MODE === 'true',
    ```
  - IF_FAIL: Check for syntax errors, ensure boolean conversion

### 3. Import Environment Config
**ACTION** src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - OPERATION: Import environment config
  - VALIDATE: Check imports resolve
  - LOCATION: After line 2 (path import)
  - ADD:
    ```typescript
    import { environment } from '../config/environment';
    ```

### 4. Update Browser Launch Configuration
**ACTION** src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - OPERATION: Make headless mode conditional
  - VALIDATE: Test both modes work
  - LOCATION: Replace line 52 in launchBrowser()
  - REPLACE:
    ```typescript
    headless: 'new',
    ```
  - WITH:
    ```typescript
    headless: environment.puppeteerDebugMode ? false : 'new',
    ```

### 5. Add Debug Mode Browser Options
**ACTION** src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - OPERATION: Add window configuration for debug mode
  - VALIDATE: Browser window appears when debug=true
  - LOCATION: After headless property (line 52)
  - ADD:
    ```typescript
    ...(environment.puppeteerDebugMode && {
      defaultViewport: null,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--ignore-certificate-errors',
        '--window-size=1280,800',
        '--window-position=100,100'
      ]
    }),
    ...(!environment.puppeteerDebugMode && {
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
        '--disable-gpu',
        '--ignore-certificate-errors'
      ]
    }),
    ```
  - NOTE: This replaces the existing args array

### 6. Add Debug Mode Logging
**ACTION** src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - OPERATION: Add debug mode indicator log
  - VALIDATE: Log appears in console
  - LOCATION: Beginning of launchBrowser() method (after line 50)
  - ADD:
    ```typescript
    logger.info(`Launching browser in ${environment.puppeteerDebugMode ? 'DEBUG (visible)' : 'HEADLESS'} mode`);
    ```

### 7. Update Gateway Startup Logs
**ACTION** src/apps/ibkr-gateway/src/server.ts:
  - OPERATION: Add debug mode to startup configuration log
  - VALIDATE: Check startup logs
  - LOCATION: In configuration log object (around line 20)
  - ADD:
    ```typescript
    puppeteerDebugMode: environment.puppeteerDebugMode,
    ```

## Validation Steps

1. **Unit Testing**:
   ```bash
   cd src/apps/ibkr-gateway
   npm run typecheck
   ```

2. **Integration Testing**:
   - Test with `IBKR_PUPPETEER_DEBUG_MODE=false` (default)
   - Test with `IBKR_PUPPETEER_DEBUG_MODE=true`
   - Verify browser window appears/disappears accordingly

3. **Functional Testing**:
   - Confirm authentication still works in both modes
   - Check screenshot capture works in debug mode
   - Verify browser cleanup on errors

## Rollback Strategy

If issues occur:
1. Remove environment variable from config/environment.ts
2. Revert loginAutomation.ts to `headless: 'new'`
3. Remove .env.example documentation
4. Remove startup log addition

## Success Criteria

- [ ] Environment variable controls headless mode
- [ ] Browser window visible when debug=true
- [ ] No impact on authentication functionality
- [ ] Clear logging indicates current mode
- [ ] TypeScript compilation passes
- [ ] Both modes handle errors correctly

## Notes

- Debug mode useful for:
  - Troubleshooting authentication failures
  - Watching browser automation steps
  - Debugging selector issues
  - Capturing manual interventions
  
- Window positioning ensures browser doesn't overlap terminal
- defaultViewport: null allows full-size window in debug mode
- Keep existing args for compatibility