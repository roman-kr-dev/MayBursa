# PRP: Migrate IBKR Gateway to Shared Logger Utility

## Context

```yaml
context:
  description: Remove the local logger implementation in ibkr-gateway and replace all usage with the shared logger utility from shared-utils package
  
  docs:
    - url: src/packages/shared-utils/src/logger/README.md
      focus: How to use the shared logger
    - url: src/packages/shared-utils/src/logger/index.ts
      focus: Available exports and interfaces

  patterns:
    - file: src/packages/shared-utils/src/logger/__tests__/logger.test.ts
      copy: Example usage of createLogger and defaultLogger

  gotchas:
    - issue: "Package dependency needs to be added"
      fix: "Add @monorepo/shared-utils to package.json dependencies"
    - issue: "Log file paths may change"
      fix: "Update any log file path references or monitoring"
```

## Phase 1: Add Dependency and Remove Old Logger

### ADD Dependency to src/apps/ibkr-gateway/package.json:
  - ADD: "@monorepo/shared-utils": "workspace:*" to dependencies
  - RUN: npm install
  - VALIDATE: npm list @monorepo/shared-utils
  - IF_FAIL: Check workspace configuration
  - ROLLBACK: Remove dependency

### DELETE src/apps/ibkr-gateway/src/utils/logger.ts:
  - REMOVE: Delete the file immediately
  - VALIDATE: ls src/apps/ibkr-gateway/src/utils/
  - IF_FAIL: File doesn't exist, continue
  - ROLLBACK: Restore from git

### CLEANUP src/apps/ibkr-gateway/src/utils/:
  - CHECK: If directory is empty after logger removal
  - DELETE: Remove directory if empty
  - VALIDATE: ls src/apps/ibkr-gateway/src/utils/
  - IF_FAIL: Directory not empty, keep it
  - ROLLBACK: Recreate directory if needed

## Phase 2: Update All Imports

### UPDATE src/apps/ibkr-gateway/src/services/connectionStatus.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/server.ts:
  - REPLACE: `import { logger } from './utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/controllers/authController.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/index.ts:
  - REPLACE: `import { logger } from './utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/services/authStatus.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/services/authMonitor.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/controllers/gatewayController.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/controllers/statusController.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/services/clientPortalManager.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

### UPDATE src/apps/ibkr-gateway/src/services/loginAutomation.ts:
  - REPLACE: `import { logger } from '../utils/logger';`
  - WITH: `import { defaultLogger as logger } from '@monorepo/shared-utils';`
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Try createLogger if specific config needed
  - ROLLBACK: Revert import change

## Phase 3: Handle Edge Cases

### UPDATE src/apps/ibkr-gateway/src/config/environment.ts:
  - FIND: `console.warn` usage at line 36
  - CONSIDER: Replace with logger if appropriate
  - NOTE: May need to keep console.warn if logger not available at config time
  - VALIDATE: npm run build:ibkr-gateway
  - IF_FAIL: Keep console.warn
  - ROLLBACK: Revert to console.warn

## Phase 4: Fix Any Breaking Changes

### HANDLE Method Changes:
  - IF: Logger methods have different signatures
  - UPDATE: Call sites to match new signatures
  - COMMON: logger.info(message, metadata) format
  - VALIDATE: Check all logger method calls compile
  - IF_FAIL: Update method calls
  - ROLLBACK: Document incompatible changes

### HANDLE Configuration:
  - IF: Need specific log levels or transports
  - CREATE: Custom logger instance with createLogger
  - EXAMPLE: 
    ```typescript
    import { createLogger, LogLevel } from '@monorepo/shared-utils';
    const logger = createLogger({
      level: LogLevel.DEBUG,
      transports: [{ type: 'console' }, { type: 'file', filename: 'app.log' }]
    });
    ```
  - VALIDATE: Logger behaves as expected
  - IF_FAIL: Adjust configuration
  - ROLLBACK: Use defaultLogger

## Phase 5: Validation and Testing

### RUN Full Build:
  - EXECUTE: npm run build
  - VERIFY: No TypeScript errors
  - CHECK: Build output includes ibkr-gateway
  - VALIDATE: Check dist folder structure
  - IF_FAIL: Fix any compilation errors
  - ROLLBACK: Restore all original files

### TEST Logging Output:
  - START: npm run dev:ibkr-gateway
  - VERIFY: Console logs appear
  - CHECK: Log formatting is acceptable
  - TEST: Different log levels work
  - VALIDATE: Application starts without errors
  - IF_FAIL: Debug logger initialization
  - ROLLBACK: Check import paths

### VERIFY Log Files (if applicable):
  - CHECK: If file transports are configured
  - VERIFY: Log files are created
  - NOTE: File paths may differ from old logger
  - VALIDATE: Logs are being written
  - IF_FAIL: Check file permissions
  - ROLLBACK: Adjust transport configuration

## Success Criteria

- [ ] Old logger file deleted
- [ ] All 10 imports updated to use shared logger
- [ ] No TypeScript compilation errors
- [ ] Application starts successfully
- [ ] Logs appear in console
- [ ] No runtime errors related to logging
- [ ] Build completes successfully

## Notes

- The shared logger from @monorepo/shared-utils is the standard for the monorepo
- No backwards compatibility needed - embrace the new logger's features
- defaultLogger is pre-configured and ready to use
- Use createLogger for custom configurations when needed
- Any breaking changes should be fixed by updating the code, not maintaining compatibility