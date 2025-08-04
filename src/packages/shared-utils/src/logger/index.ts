import winston from 'winston';
import type { Logger, LoggerOptions, TransportConfig, LogLevel } from './types';
import { getDefaultFormats } from './formats';
import { safeStringify } from './utils';

function createTransport(config: TransportConfig): winston.transport {
  const { type, format: transportFormat, ...options } = config;

  switch (type) {
    case 'console':
      return new winston.transports.Console({
        ...options,
        format: transportFormat
      });
    
    case 'file':
      return new winston.transports.File({
        ...options,
        format: transportFormat
      });
    
    case 'stream':
      return new winston.transports.Stream({
        ...options,
        format: transportFormat,
        stream: process.stdout
      });
    
    default:
      throw new Error(`Unknown transport type: ${type}`);
  }
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const {
    level = 'info' as LogLevel,
    format: formatOptions = {},
    transports: transportConfigs = [{ type: 'console' }],
    defaultMeta = {},
    exitOnError = false,
    silent = false
  } = options;

  const formats = getDefaultFormats(formatOptions);
  
  const transports = transportConfigs.map(config => createTransport(config));

  const logger = winston.createLogger({
    level,
    format: formats,
    defaultMeta,
    transports,
    exitOnError,
    silent
  });

  const originalError = logger.error.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalInfo = logger.info.bind(logger);
  const originalDebug = logger.debug.bind(logger);

  const wrapMethod = (method: Function) => {
    return function(message: any, ...meta: any[]) {
      if (typeof message === 'object' && message !== null) {
        message = safeStringify(message);
      }
      
      if (meta.length > 0) {
        meta = meta.map(m => 
          typeof m === 'object' && m !== null ? JSON.parse(safeStringify(m)) : m
        );
      }
      
      return method(message, ...meta);
    };
  };

  logger.error = wrapMethod(originalError);
  logger.warn = wrapMethod(originalWarn);
  logger.info = wrapMethod(originalInfo);
  logger.debug = wrapMethod(originalDebug);

  return logger;
}

export const defaultLogger = createLogger();

export * from './types';
export { safeStringify } from './utils';