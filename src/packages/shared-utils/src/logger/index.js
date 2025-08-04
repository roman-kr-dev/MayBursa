"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeStringify = exports.defaultLogger = void 0;
exports.createLogger = createLogger;
const winston_1 = __importDefault(require("winston"));
const formats_1 = require("./formats");
const utils_1 = require("./utils");
function createTransport(config) {
    const { type, format: transportFormat, ...options } = config;
    switch (type) {
        case 'console':
            return new winston_1.default.transports.Console({
                ...options,
                format: transportFormat
            });
        case 'file':
            return new winston_1.default.transports.File({
                ...options,
                format: transportFormat
            });
        case 'stream':
            return new winston_1.default.transports.Stream({
                ...options,
                format: transportFormat,
                stream: process.stdout
            });
        default:
            throw new Error(`Unknown transport type: ${type}`);
    }
}
function createLogger(options = {}) {
    const { level = 'info', format: formatOptions = {}, transports: transportConfigs = [{ type: 'console' }], defaultMeta = {}, exitOnError = false, silent = false } = options;
    const formats = (0, formats_1.getDefaultFormats)(formatOptions);
    const transports = transportConfigs.map(config => createTransport(config));
    const logger = winston_1.default.createLogger({
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
    const wrapMethod = (method) => {
        return function (message, ...meta) {
            if (typeof message === 'object' && message !== null) {
                message = (0, utils_1.safeStringify)(message);
            }
            if (meta.length > 0) {
                meta = meta.map(m => typeof m === 'object' && m !== null ? JSON.parse((0, utils_1.safeStringify)(m)) : m);
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
exports.defaultLogger = createLogger();
__exportStar(require("./types"), exports);
var utils_2 = require("./utils");
Object.defineProperty(exports, "safeStringify", { enumerable: true, get: function () { return utils_2.safeStringify; } });
