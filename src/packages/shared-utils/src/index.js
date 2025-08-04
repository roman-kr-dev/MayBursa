"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeStringify = exports.defaultLogger = exports.createLogger = exports.parseNumberSafely = exports.roundToDecimal = exports.clamp = exports.throttle = exports.debounce = exports.sleep = exports.generateRequestId = exports.isApiError = exports.createErrorResponse = exports.createSuccessResponse = exports.formatCompactNumber = exports.formatPercentage = exports.formatNumber = exports.formatCurrency = exports.getRelativeTime = exports.formatDateTime = exports.formatTime = exports.formatDate = void 0;
// Date Formatting Utilities
const formatDate = (date, format = 'short') => {
    const d = typeof date === 'string' ? new Date(date) : date;
    switch (format) {
        case 'short':
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        case 'long':
            return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        case 'iso':
            return d.toISOString();
        default:
            return d.toLocaleDateString();
    }
};
exports.formatDate = formatDate;
const formatTime = (date, includeSeconds = false) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: includeSeconds ? '2-digit' : undefined
    });
};
exports.formatTime = formatTime;
const formatDateTime = (date) => {
    return `${(0, exports.formatDate)(date)} ${(0, exports.formatTime)(date)}`;
};
exports.formatDateTime = formatDateTime;
const getRelativeTime = (date) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHours = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHours / 24);
    if (diffSecs < 60)
        return 'just now';
    if (diffMins < 60)
        return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24)
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30)
        return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    return (0, exports.formatDate)(d);
};
exports.getRelativeTime = getRelativeTime;
// Number Formatting Utilities
const formatCurrency = (amount, currency = 'USD', showCents = true) => {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
        minimumFractionDigits: showCents ? 2 : 0,
        maximumFractionDigits: showCents ? 2 : 0
    }).format(amount);
};
exports.formatCurrency = formatCurrency;
const formatNumber = (num, decimals = 0, useCommas = true) => {
    if (useCommas) {
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(num);
    }
    return num.toFixed(decimals);
};
exports.formatNumber = formatNumber;
const formatPercentage = (value, decimals = 2, includeSign = true) => {
    const formatted = (0, exports.formatNumber)(value, decimals);
    const sign = includeSign && value > 0 ? '+' : '';
    return `${sign}${formatted}%`;
};
exports.formatPercentage = formatPercentage;
const formatCompactNumber = (num) => {
    const formatter = new Intl.NumberFormat('en-US', {
        notation: 'compact',
        compactDisplay: 'short'
    });
    return formatter.format(num);
};
exports.formatCompactNumber = formatCompactNumber;
// API Response Helpers
const createSuccessResponse = (data, meta) => {
    return {
        success: true,
        data,
        meta: {
            timestamp: new Date(),
            requestId: (0, exports.generateRequestId)(),
            ...meta
        }
    };
};
exports.createSuccessResponse = createSuccessResponse;
const createErrorResponse = (error) => {
    return {
        success: false,
        error: {
            code: error.code || 'UNKNOWN_ERROR',
            message: error.message,
            details: error.details
        },
        meta: {
            timestamp: new Date(),
            requestId: (0, exports.generateRequestId)()
        }
    };
};
exports.createErrorResponse = createErrorResponse;
const isApiError = (response) => {
    return !response.success && !!response.error;
};
exports.isApiError = isApiError;
// Utility Functions
const generateRequestId = () => {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};
exports.generateRequestId = generateRequestId;
const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const debounce = (func, wait) => {
    let timeout = null;
    return (...args) => {
        if (timeout)
            clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};
exports.debounce = debounce;
const throttle = (func, limit) => {
    let inThrottle = false;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};
exports.throttle = throttle;
const clamp = (value, min, max) => {
    return Math.min(Math.max(value, min), max);
};
exports.clamp = clamp;
const roundToDecimal = (value, decimals) => {
    return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};
exports.roundToDecimal = roundToDecimal;
const parseNumberSafely = (value, fallback = 0) => {
    if (typeof value === 'number')
        return value;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? fallback : parsed;
};
exports.parseNumberSafely = parseNumberSafely;
// Logger exports
var logger_1 = require("./logger");
Object.defineProperty(exports, "createLogger", { enumerable: true, get: function () { return logger_1.createLogger; } });
Object.defineProperty(exports, "defaultLogger", { enumerable: true, get: function () { return logger_1.defaultLogger; } });
Object.defineProperty(exports, "safeStringify", { enumerable: true, get: function () { return logger_1.safeStringify; } });
