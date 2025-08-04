import winston from 'winston';
import type { LogFormat } from './types';
export declare function getDefaultFormats(options?: LogFormat): winston.Logform.Format;
export declare const developmentFormat: winston.Logform.Format;
export declare const productionFormat: winston.Logform.Format;
export declare const consoleFormat: winston.Logform.Format;
export declare const fileFormat: winston.Logform.Format;
//# sourceMappingURL=formats.d.ts.map