import type { Logger as WinstonLogger } from 'winston';
export declare enum LogLevel {
    ERROR = "error",
    WARN = "warn",
    INFO = "info",
    HTTP = "http",
    VERBOSE = "verbose",
    DEBUG = "debug",
    SILLY = "silly"
}
export interface TransportConfig {
    type: 'console' | 'file' | 'stream';
    level?: LogLevel;
    filename?: string;
    dirname?: string;
    colorize?: boolean;
    handleExceptions?: boolean;
    handleRejections?: boolean;
    maxsize?: number;
    maxFiles?: number;
    tailable?: boolean;
    zippedArchive?: boolean;
    format?: any;
}
export interface LogFormat {
    timestamp?: boolean | {
        format?: string;
    };
    colorize?: boolean;
    prettyPrint?: boolean | {
        depth?: number;
    };
    json?: boolean;
    simple?: boolean;
    align?: boolean;
    label?: string;
    errors?: {
        stack?: boolean;
    };
}
export interface LoggerOptions {
    level?: LogLevel;
    format?: LogFormat;
    transports?: TransportConfig[];
    defaultMeta?: Record<string, any>;
    exitOnError?: boolean;
    silent?: boolean;
}
export type Logger = WinstonLogger;
//# sourceMappingURL=types.d.ts.map