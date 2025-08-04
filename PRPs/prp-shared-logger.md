# PRP: Create Shared Logger Utility

## Context

```yaml
context:
  docs:
    - url: https://github.com/winstonjs/winston
      focus: Winston v3 configuration and transports

  patterns:
    - file: src/packages/shared-utils/src/index.ts
      copy: Export pattern for shared utilities

  gotchas:
    - issue: "Winston file transports require log directory to exist"
      fix: "Create logs directory on initialization or handle ENOENT errors"
    - issue: "Circular references in logged objects can cause JSON.stringify errors"
      fix: "Implement safe stringify with circular reference detection"
    - issue: "Different apps need different log configurations"
      fix: "Export configurable factory function instead of singleton"
```

## Task Breakdown

### 1. Setup Dependencies
ACTION src/packages/shared-utils/package.json:
  - OPERATION: Add winston dependency (^3.11.0)
  - VALIDATE: pnpm install in shared-utils directory
  - IF_FAIL: Check pnpm workspace configuration
  - ROLLBACK: Remove dependency from package.json

### 2. Create Logger Types
ACTION src/packages/shared-utils/src/logger/types.ts:
  - OPERATION: Define TypeScript interfaces for logger configuration
  - INCLUDE:
    - LoggerOptions interface
    - LogLevel enum
    - TransportConfig interface
    - LogFormat interface
  - VALIDATE: TypeScript compilation passes
  - IF_FAIL: Check winston type imports
  - ROLLBACK: Delete file

### 3. Create Safe Stringify Utility
ACTION src/packages/shared-utils/src/logger/utils.ts:
  - OPERATION: Implement safe JSON stringify for circular references
  - INCLUDE:
    - Circular reference detection
    - Error object serialization
    - Large object truncation option
  - VALIDATE: Unit test with circular objects
  - IF_FAIL: Review JSON.stringify replacer function
  - ROLLBACK: Delete file

### 4. Create Logger Factory
ACTION src/packages/shared-utils/src/logger/index.ts:
  - OPERATION: Implement configurable logger factory
  - INCLUDE:
    - Default configuration
    - Transport creation logic
    - Format customization
    - Metadata handling
  - VALIDATE: Create test logger instance
  - IF_FAIL: Check winston.createLogger syntax
  - ROLLBACK: Delete file

### 5. Create Default Formats
ACTION src/packages/shared-utils/src/logger/formats.ts:
  - OPERATION: Define reusable log formats
  - INCLUDE:
    - Timestamp format
    - Error format with stack traces
    - Pretty print for development
    - JSON format for production
  - VALIDATE: Format outputs correctly
  - IF_FAIL: Review winston.format documentation
  - ROLLBACK: Delete file

### 6. Update Package Exports
ACTION src/packages/shared-utils/src/index.ts:
  - OPERATION: Export logger module and types
  - VALIDATE: Build succeeds with pnpm build
  - IF_FAIL: Check export syntax and paths
  - ROLLBACK: Remove logger exports

### 7. Build Package
ACTION terminal in shared-utils:
  - OPERATION: Run pnpm build
  - VALIDATE: dist/ contains logger modules
  - IF_FAIL: Check tsup.config.ts settings
  - ROLLBACK: Clean dist directory

### 8. Create Unit Tests
ACTION src/packages/shared-utils/src/logger/__tests__/logger.test.ts:
  - OPERATION: Write comprehensive unit tests
  - INCLUDE:
    - Factory function tests
    - Configuration tests
    - Format tests
    - Error handling tests
  - VALIDATE: Tests pass with pnpm test
  - IF_FAIL: Debug individual test cases
  - ROLLBACK: Delete test file

### 9. Create Documentation
ACTION src/packages/shared-utils/src/logger/README.md:
  - OPERATION: Document logger API and usage
  - INCLUDE:
    - API reference
    - Configuration options
    - Usage examples
    - Best practices
  - VALIDATE: Documentation is complete
  - IF_FAIL: Add missing sections
  - ROLLBACK: Delete file

## Implementation Details

### Logger Factory API
```typescript
export function createLogger(options?: LoggerOptions): Logger {
  // Merge with defaults
  // Create winston instance
  // Add configured transports
  // Return logger instance
}

export const defaultLogger = createLogger();
```

### Configuration Options
```typescript
interface LoggerOptions {
  level?: LogLevel;
  format?: LogFormat;
  transports?: TransportConfig[];
  defaultMeta?: Record<string, any>;
  exitOnError?: boolean;
  silent?: boolean;
}
```

### Usage Examples
```typescript
// Basic usage
import { createLogger } from '@maybursa/shared-utils';
const logger = createLogger();

// Custom configuration
const logger = createLogger({
  level: 'debug',
  transports: [
    { type: 'console', colorize: true },
    { type: 'file', filename: 'app.log' }
  ]
});

// With default metadata
const logger = createLogger({
  defaultMeta: { service: 'my-app' }
});
```

## Validation Strategy

1. **Unit Tests**: Test all logger functions and configurations
2. **Type Safety**: Ensure TypeScript types are comprehensive
3. **Build Verification**: Package builds without warnings
4. **Integration Test**: Create sample logger in test file
5. **Performance Check**: Verify no memory leaks with circular refs

## Success Criteria

1. ✓ Logger factory function exported from shared-utils
2. ✓ Supports multiple transport types
3. ✓ Handles circular references safely
4. ✓ TypeScript types fully defined
5. ✓ Configurable log levels and formats
6. ✓ Unit tests provide >90% coverage
7. ✓ Documentation includes all options
8. ✓ No breaking changes to shared-utils

## Rollback Plan

1. Remove src/logger directory
2. Remove winston from dependencies
3. Remove logger exports from index.ts
4. Run pnpm build to verify clean state
5. Commit reversion

## Performance Considerations

- Use async file writes for file transports
- Implement log level filtering early in pipeline
- Consider lazy evaluation for expensive log data
- Set reasonable file rotation limits
- Avoid logging in tight loops

## Security Notes

- Never log sensitive data (credentials, tokens, PII)
- Sanitize user input before logging
- Set appropriate file permissions for log files
- Consider log retention and rotation policies
- Implement redaction for sensitive fields