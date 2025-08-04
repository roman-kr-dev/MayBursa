import winston from 'winston';
import type { LogFormat } from './types';

const { format } = winston;

export function getDefaultFormats(options: LogFormat = {}): winston.Logform.Format {
  const {
    timestamp = true,
    colorize = process.env.NODE_ENV !== 'production',
    prettyPrint = process.env.NODE_ENV !== 'production',
    json = process.env.NODE_ENV === 'production',
    simple = false,
    align = false,
    label,
    errors = { stack: true }
  } = options;

  const formats: winston.Logform.Format[] = [];

  if (label) {
    formats.push(format.label({ label }));
  }

  if (timestamp) {
    const timestampFormat = typeof timestamp === 'object' && timestamp.format
      ? timestamp.format
      : 'YYYY-MM-DD HH:mm:ss.SSS';
    
    formats.push(format.timestamp({ format: timestampFormat }));
  }

  if (errors) {
    formats.push(format.errors(errors));
  }

  if (align) {
    formats.push(format.align());
  }

  if (json) {
    formats.push(format.json());
  } else if (simple) {
    formats.push(format.simple());
  } else if (prettyPrint) {
    const prettyOptions = typeof prettyPrint === 'object' ? prettyPrint : {};
    formats.push(format.prettyPrint(prettyOptions));
  }

  if (colorize && !json) {
    formats.push(format.colorize({ all: true }));
  }

  if (formats.length === 0) {
    return format.simple();
  }

  return format.combine(...formats);
}

export const developmentFormat = getDefaultFormats({
  timestamp: true,
  colorize: true,
  prettyPrint: true,
  errors: { stack: true }
});

export const productionFormat = getDefaultFormats({
  timestamp: true,
  json: true,
  errors: { stack: true }
});

export const consoleFormat = format.combine(
  format.timestamp({ format: 'HH:mm:ss.SSS' }),
  format.colorize({ all: true }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

// Custom format to strip ANSI color codes
const stripAnsi = format((info) => {
  const stripAnsiRegex = /\x1B\[[0-9;]*m/g;
  
  // Strip ANSI codes from all string values
  Object.keys(info).forEach(key => {
    if (typeof info[key] === 'string') {
      info[key] = info[key].replace(stripAnsiRegex, '');
    }
  });
  
  return info;
});

export const fileFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: true }),
  stripAnsi(),
  format.json()
);