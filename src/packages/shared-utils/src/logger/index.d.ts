import winston from 'winston';
import type { Logger, LoggerOptions } from './types';
export declare function createLogger(options?: LoggerOptions): Logger;
export declare const defaultLogger: winston.Logger;
export * from './types';
export { safeStringify } from './utils';
//# sourceMappingURL=index.d.ts.map