"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileFormat = exports.consoleFormat = exports.productionFormat = exports.developmentFormat = void 0;
exports.getDefaultFormats = getDefaultFormats;
const winston_1 = __importDefault(require("winston"));
const { format } = winston_1.default;
function getDefaultFormats(options = {}) {
    const { timestamp = true, colorize = process.env.NODE_ENV !== 'production', prettyPrint = process.env.NODE_ENV !== 'production', json = process.env.NODE_ENV === 'production', simple = false, align = false, label, errors = { stack: true } } = options;
    const formats = [];
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
    }
    else if (simple) {
        formats.push(format.simple());
    }
    else if (prettyPrint) {
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
exports.developmentFormat = getDefaultFormats({
    timestamp: true,
    colorize: true,
    prettyPrint: true,
    errors: { stack: true }
});
exports.productionFormat = getDefaultFormats({
    timestamp: true,
    json: true,
    errors: { stack: true }
});
exports.consoleFormat = format.combine(format.timestamp({ format: 'HH:mm:ss.SSS' }), format.colorize({ all: true }), format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
    return `[${timestamp}] ${level}: ${message}${metaStr}`;
}));
exports.fileFormat = format.combine(format.timestamp(), format.errors({ stack: true }), format.json());
