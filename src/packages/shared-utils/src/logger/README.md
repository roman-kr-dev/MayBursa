# Logger Module

A flexible, type-safe logging utility built on Winston v3 with safe circular reference handling.

## Features

- Configurable log levels and formats
- Multiple transport support (console, file, stream)
- Safe circular reference handling
- TypeScript support with full type definitions
- Customizable formatting options
- Production-ready with JSON logging

## Installation

The logger is included in the `@monorepo/shared-utils` package.

```typescript
import { createLogger, defaultLogger } from '@monorepo/shared-utils';
```

## Basic Usage

### Using the Default Logger

```typescript
import { defaultLogger } from '@monorepo/shared-utils';

defaultLogger.info('Application started');
defaultLogger.error('An error occurred', { error: err });
defaultLogger.debug('Debug information', { data: someObject });
```

### Creating a Custom Logger

```typescript
import { createLogger, LogLevel } from '@monorepo/shared-utils';

const logger = createLogger({
  level: LogLevel.DEBUG,
  defaultMeta: { service: 'my-service' },
  transports: [
    { type: 'console', colorize: true },
    { type: 'file', filename: 'app.log' }
  ]
});
```

## API Reference

### createLogger(options?: LoggerOptions): Logger

Creates a new logger instance with the specified configuration.

#### LoggerOptions

```typescript
interface LoggerOptions {
  level?: LogLevel;              // Default: 'info'
  format?: LogFormat;            // Custom format options
  transports?: TransportConfig[]; // Default: [{ type: 'console' }]
  defaultMeta?: Record<string, any>; // Default metadata
  exitOnError?: boolean;         // Default: false
  silent?: boolean;              // Default: false
}
```

#### LogLevel

```typescript
enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  VERBOSE = 'verbose',
  DEBUG = 'debug',
  SILLY = 'silly'
}
```

#### TransportConfig

```typescript
interface TransportConfig {
  type: 'console' | 'file' | 'stream';
  level?: LogLevel;
  filename?: string;      // For file transport
  dirname?: string;       // For file transport
  colorize?: boolean;     // For console transport
  handleExceptions?: boolean;
  handleRejections?: boolean;
  maxsize?: number;       // For file transport
  maxFiles?: number;      // For file transport
  format?: any;           // Custom transport format
}
```

#### LogFormat

```typescript
interface LogFormat {
  timestamp?: boolean | { format?: string };
  colorize?: boolean;
  prettyPrint?: boolean | { depth?: number };
  json?: boolean;
  simple?: boolean;
  align?: boolean;
  label?: string;
  errors?: { stack?: boolean };
}
```

### safeStringify(obj: any, options?: SafeStringifyOptions): string

Safely converts objects to JSON strings, handling circular references and other edge cases.

```typescript
interface SafeStringifyOptions {
  maxDepth?: number;        // Default: 10
  maxArrayLength?: number;  // Default: 100
  maxStringLength?: number; // Default: 1000
}
```

## Usage Examples

### Basic Logging

```typescript
const logger = createLogger();

logger.info('User logged in', { userId: 123 });
logger.warn('API rate limit approaching', { remaining: 10 });
logger.error('Database connection failed', { error: err });
```

### File Logging

```typescript
const logger = createLogger({
  transports: [
    { type: 'console' },
    { 
      type: 'file', 
      filename: 'app.log',
      dirname: './logs',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }
  ]
});
```

### Environment-Based Configuration

```typescript
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: process.env.NODE_ENV === 'production' 
    ? { json: true } 
    : { prettyPrint: true, colorize: true }
});
```

### Custom Metadata

```typescript
const logger = createLogger({
  defaultMeta: {
    service: 'api-gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV
  }
});

// All logs will include the default metadata
logger.info('Request received');
```

### Handling Circular References

```typescript
const circularObj = { name: 'test' };
circularObj.self = circularObj;

// This won't throw an error
logger.info('Circular object:', circularObj);
```

## Best Practices

1. **Use appropriate log levels**
   - ERROR: Error events that might still allow the application to continue
   - WARN: Potentially harmful situations
   - INFO: Informational messages highlighting progress
   - DEBUG: Detailed information for debugging

2. **Include contextual information**
   ```typescript
   logger.info('User action', {
     userId: user.id,
     action: 'update_profile',
     timestamp: new Date()
   });
   ```

3. **Use structured logging in production**
   ```typescript
   const logger = createLogger({
     format: { json: true } // Easier to parse and analyze
   });
   ```

4. **Set up log rotation for file transports**
   ```typescript
   {
     type: 'file',
     filename: 'app.log',
     maxsize: 10485760, // 10MB
     maxFiles: 5,
     tailable: true
   }
   ```

5. **Never log sensitive information**
   - Passwords, tokens, or API keys
   - Personal identifiable information (PII)
   - Credit card numbers or financial data

## Performance Considerations

- The logger uses safe stringify to prevent circular reference errors
- Large objects are automatically truncated to prevent memory issues
- File transports use async writes to avoid blocking
- Consider using appropriate log levels to reduce noise in production

## Error Handling

The logger handles various edge cases automatically:

- Circular references are replaced with '[Circular Reference]'
- Error objects are serialized with stack traces
- Functions are represented as '[Function: name]'
- Property access errors are caught and logged
- Large arrays and strings are truncated