import winston from 'winston';
import * as fs from 'fs';
import * as path from 'path';
import type { Logger, LoggerOptions, TransportConfig, LogLevel } from './types';
import { getDefaultFormats, fileFormat } from './formats';
import { safeStringify } from './utils';

function createTransport(config: TransportConfig, defaultFormat?: winston.Logform.Format): winston.transport {
  const { type, format: transportFormat, ...options } = config;

  switch (type) {
    case 'console':
      return new winston.transports.Console({
        ...options,
        format: transportFormat || defaultFormat
      });
    
    case 'file':
      return new winston.transports.File({
        ...options,
        format: transportFormat || defaultFormat
      });
    
    case 'stream':
      return new winston.transports.Stream({
        ...options,
        format: transportFormat || defaultFormat,
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
  
  const transports = transportConfigs.map(config => createTransport(config, formats));

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

// Create a singleton logger that respects LOGGER_SAVE_TO_FILE env var
export const logger = createAppLogger();

export function createAppLogger(logDir?: string): Logger {
  const saveToFile = process.env.LOGGER_SAVE_TO_FILE === 'true';
  
  // Create transports array
  const transports: winston.transport[] = [];

  // Add console transport with its own format
  // Only colorize if output is a TTY (terminal) and colors are not explicitly disabled
  const shouldColorize = process.stdout.isTTY !== false && 
                        process.env.NO_COLOR !== 'true' && 
                        process.env.FORCE_COLOR !== 'false';
  
  const consoleFormatters = [
    winston.format.timestamp({ format: 'HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true })
  ];
  
  if (shouldColorize) {
    consoleFormatters.push(winston.format.colorize({ all: true }));
  }
  
  consoleFormatters.push(
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
      return `[${timestamp}] ${level}: ${message}${metaStr}`;
    })
  );
  
  transports.push(
    new winston.transports.Console({
      format: winston.format.combine(...consoleFormatters)
    })
  );

  // Add file transport if enabled
  if (saveToFile) {
    // Use provided logDir or default to ./logs
    const logsDirectory = logDir || path.resolve(process.cwd(), 'logs');
    
    // Ensure logs directory exists
    if (!fs.existsSync(logsDirectory)) {
      fs.mkdirSync(logsDirectory, { recursive: true });
    }
    
    // Clear the log file on startup (overwrite as requested)
    const logFilePath = path.join(logsDirectory, 'app.log');
    fs.writeFileSync(logFilePath, '');
    
    transports.push(
      new winston.transports.File({
        filename: 'app.log',
        dirname: logsDirectory,
        maxsize: 10485760, // 10MB
        maxFiles: 1,
        tailable: false,
        format: fileFormat
      })
    );
  }

  // Create logger with transports
  const logger = winston.createLogger({
    level: 'info',
    transports
  });
  
  // Apply the same wrapping methods
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

export * from './types';
export { safeStringify } from './utils';