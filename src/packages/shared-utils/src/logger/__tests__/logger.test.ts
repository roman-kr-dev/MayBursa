import { createLogger, logger, safeStringify } from '../index';
import { LogLevel } from '../types';
import * as fs from 'fs';
import * as path from 'path';

describe('Logger', () => {
  describe('createLogger', () => {
    it('should create a logger with default configuration', () => {
      const logger = createLogger();
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should accept custom log level', () => {
      const logger = createLogger({ level: LogLevel.DEBUG });
      expect(logger.level).toBe('debug');
    });

    it('should accept custom metadata', () => {
      const logger = createLogger({ 
        defaultMeta: { service: 'test-service' } 
      });
      expect(logger.defaultMeta).toEqual({ service: 'test-service' });
    });

    it('should create file transport when specified', () => {
      const logFile = path.join(__dirname, 'test.log');
      const logger = createLogger({
        transports: [
          { type: 'file', filename: logFile }
        ]
      });
      
      expect(logger.transports.length).toBe(1);
      expect(logger.transports[0].constructor.name).toBe('File');
      
      // Cleanup
      if (fs.existsSync(logFile)) {
        fs.unlinkSync(logFile);
      }
    });

    it('should support multiple transports', () => {
      const logger = createLogger({
        transports: [
          { type: 'console' },
          { type: 'stream' }
        ]
      });
      
      expect(logger.transports.length).toBe(2);
    });

    it('should respect silent option', () => {
      const logger = createLogger({ silent: true });
      expect(logger.silent).toBe(true);
    });
  });

  describe('logger', () => {
    it('should be a pre-configured logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
    });
  });

  describe('safeStringify', () => {
    it('should handle circular references', () => {
      const obj: any = { a: 1 };
      obj.b = obj;
      
      const result = safeStringify(obj);
      expect(result).toContain('[Circular Reference]');
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle Error objects', () => {
      const error = new Error('Test error');
      const result = safeStringify(error);
      const parsed = JSON.parse(result);
      
      expect(parsed.name).toBe('Error');
      expect(parsed.message).toBe('Test error');
      expect(parsed.stack).toBeDefined();
    });

    it('should handle Date objects', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const result = safeStringify(date);
      expect(result).toContain('2024-01-01T00:00:00.000Z');
    });

    it('should handle RegExp objects', () => {
      const regex = /test/gi;
      const result = safeStringify(regex);
      expect(result).toContain('/test/gi');
    });

    it('should handle functions', () => {
      const func = function testFunction() {};
      const result = safeStringify(func);
      expect(result).toContain('[Function: testFunction]');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(2000);
      const result = safeStringify(longString, { maxStringLength: 100 });
      const parsed = JSON.parse(result);
      expect(parsed).toContain('...[truncated]');
      expect(parsed.length).toBeLessThan(150);
    });

    it('should truncate large arrays', () => {
      const largeArray = new Array(200).fill('item');
      const result = safeStringify(largeArray, { maxArrayLength: 10 });
      const parsed = JSON.parse(result);
      expect(parsed.length).toBe(11);
      expect(parsed[10]).toContain('190 more items');
    });

    it('should respect max depth', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: 'deep value'
            }
          }
        }
      };
      const result = safeStringify(deepObject, { maxDepth: 2 });
      expect(result).toContain('[Max Depth Exceeded]');
    });

    it('should handle null and undefined', () => {
      expect(safeStringify(null)).toBe('null');
      expect(safeStringify(undefined)).toBe(undefined);
    });

    it('should handle property access errors', () => {
      const obj = {};
      Object.defineProperty(obj, 'throwingProp', {
        get() { throw new Error('Property access error'); },
        enumerable: true
      });
      
      const result = safeStringify(obj);
      expect(result).toContain('[Error accessing property:');
    });
  });

  describe('Logger methods with safe stringify', () => {
    it('should safely log objects with circular references', () => {
      const logger = createLogger({ silent: true });
      const obj: any = { a: 1 };
      obj.b = obj;
      
      expect(() => logger.info(obj)).not.toThrow();
    });

    it('should safely log error objects', () => {
      const logger = createLogger({ silent: true });
      const error = new Error('Test error');
      
      expect(() => logger.error(error)).not.toThrow();
    });

    it('should handle metadata with circular references', () => {
      const logger = createLogger({ silent: true });
      const meta: any = { extra: 'data' };
      meta.circular = meta;
      
      expect(() => logger.info('Test message', meta)).not.toThrow();
    });
  });

  describe('Format options', () => {
    it('should use different formats based on NODE_ENV', () => {
      const originalEnv = process.env.NODE_ENV;
      
      process.env.NODE_ENV = 'production';
      const prodLogger = createLogger();
      expect(prodLogger.format).toBeDefined();
      
      process.env.NODE_ENV = 'development';
      const devLogger = createLogger();
      expect(devLogger.format).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });

    it('should accept custom format options', () => {
      const logger = createLogger({
        format: {
          timestamp: { format: 'YYYY-MM-DD' },
          label: 'test-app',
          json: true
        }
      });
      
      expect(logger.format).toBeDefined();
    });
  });

  describe('Transport error handling', () => {
    it('should throw error for unknown transport type', () => {
      expect(() => createLogger({
        transports: [{ type: 'unknown' as any }]
      })).toThrow('Unknown transport type: unknown');
    });
  });

  describe('SafeStringify edge cases', () => {
    it('should handle anonymous functions', () => {
      const func = () => {};
      const result = safeStringify(func);
      expect(result).toContain('[Function: func]');
    });

    it('should handle all value types in arrays', () => {
      const complexArray = [
        null,
        undefined,
        'string',
        123,
        true,
        new Date('2024-01-01'),
        /regex/,
        () => {},
        { nested: 'object' }
      ];
      const result = safeStringify(complexArray);
      expect(() => JSON.parse(result)).not.toThrow();
    });

    it('should handle deep objects exceeding max depth', () => {
      let deep: any = { value: 'bottom' };
      for (let i = 0; i < 15; i++) {
        deep = { level: deep };
      }
      const result = safeStringify(deep, { maxDepth: 5 });
      expect(result).toContain('[Max Depth Exceeded]');
    });

    it('should handle stringify errors', () => {
      const circular: any = { a: 1 };
      circular.b = circular;
      // Force an error by modifying JSON.stringify
      const originalStringify = JSON.stringify;
      JSON.stringify = () => { throw new Error('Stringify failed'); };
      
      const result = safeStringify(circular);
      expect(result).toContain('[Stringify Error:');
      
      JSON.stringify = originalStringify;
    });
  });

  describe('Format combinations', () => {
    it('should handle format with no options', () => {
      const logger = createLogger({
        format: {}
      });
      expect(logger.format).toBeDefined();
    });

    it('should handle simple format', () => {
      const logger = createLogger({
        format: { simple: true }
      });
      expect(logger.format).toBeDefined();
    });

    it('should handle production format without colorize', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      
      const logger = createLogger({
        format: { json: true, colorize: true }
      });
      expect(logger.format).toBeDefined();
      
      process.env.NODE_ENV = originalEnv;
    });
  });
});