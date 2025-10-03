"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEnvVarAsBoolean = exports.getEnvVarAsNumber = exports.getEnvVar = exports.calculateWeightedDistribution = exports.calculateConversionRate = exports.createRateLimiter = exports.retry = exports.createError = exports.XafraError = exports.getUserAgent = exports.getClientIP = exports.measureTimeAsync = exports.measureTime = exports.isValidTrackingId = exports.isValidApiKey = exports.isValidProductId = exports.isWithinTimeframe = exports.formatDate = exports.getCurrentTimestamp = exports.isKolbiOperator = exports.normalizeOperatorCode = exports.normalizeCountryCode = exports.truncateString = exports.sanitizeString = exports.buildConfirmUrl = exports.buildTrackingUrl = exports.isValidUrl = exports.generateShortTracking = exports.generateTrackingId = exports.generateApiKey = exports.generateUUID = void 0;
const crypto_1 = require("crypto");
// Generate UUID v4
const generateUUID = () => {
    const bytes = (0, crypto_1.randomBytes)(16);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant bits
    const hex = bytes.toString('hex');
    return [
        hex.substring(0, 8),
        hex.substring(8, 12),
        hex.substring(12, 16),
        hex.substring(16, 20),
        hex.substring(20, 32)
    ].join('-');
};
exports.generateUUID = generateUUID;
// Generate API key
const generateApiKey = () => {
    return (0, crypto_1.randomBytes)(16).toString('hex');
};
exports.generateApiKey = generateApiKey;
// Generate tracking ID
const generateTrackingId = (prefix) => {
    const timestamp = Date.now().toString(36);
    const random = (0, crypto_1.randomBytes)(4).toString('hex');
    return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
};
exports.generateTrackingId = generateTrackingId;
// Generate short tracking for Kolbi (Costa Rica)
const generateShortTracking = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};
exports.generateShortTracking = generateShortTracking;
// URL utilities
const isValidUrl = (url) => {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
};
exports.isValidUrl = isValidUrl;
const buildTrackingUrl = (baseUrl, encryptedId, path = 'ads', tracker) => {
    const url = new URL(`${baseUrl}/${path}/${encryptedId}`);
    if (tracker) {
        url.searchParams.set('tracker', tracker);
    }
    return url.toString();
};
exports.buildTrackingUrl = buildTrackingUrl;
const buildConfirmUrl = (baseUrl, apiKey, tracking, isShort = false) => {
    const path = isShort ? 'confirm/short' : 'confirm';
    return `${baseUrl}/${path}/${apiKey}/${tracking}`;
};
exports.buildConfirmUrl = buildConfirmUrl;
// String utilities
const sanitizeString = (str) => {
    return str.replace(/[<>\"'&]/g, '');
};
exports.sanitizeString = sanitizeString;
const truncateString = (str, maxLength) => {
    return str.length > maxLength ? str.substring(0, maxLength) + '...' : str;
};
exports.truncateString = truncateString;
// Country and operator utilities
const normalizeCountryCode = (country) => {
    return country.toUpperCase().substring(0, 2);
};
exports.normalizeCountryCode = normalizeCountryCode;
const normalizeOperatorCode = (operator) => {
    return operator.trim().toUpperCase();
};
exports.normalizeOperatorCode = normalizeOperatorCode;
const isKolbiOperator = (country, operator) => {
    return country === 'CR' && operator?.toUpperCase() === 'KOLBI';
};
exports.isKolbiOperator = isKolbiOperator;
// Date utilities
const getCurrentTimestamp = () => {
    return Date.now();
};
exports.getCurrentTimestamp = getCurrentTimestamp;
const formatDate = (timestamp) => {
    return new Date(timestamp).toISOString();
};
exports.formatDate = formatDate;
const isWithinTimeframe = (timestamp, hoursAgo) => {
    const timeframe = hoursAgo * 60 * 60 * 1000; // Convert hours to milliseconds
    return Date.now() - timestamp <= timeframe;
};
exports.isWithinTimeframe = isWithinTimeframe;
// Validation utilities
const isValidProductId = (id) => {
    return typeof id === 'number' && id > 0 && Number.isInteger(id);
};
exports.isValidProductId = isValidProductId;
const isValidApiKey = (key) => {
    return typeof key === 'string' && key.length === 32 && /^[a-f0-9]{32}$/.test(key);
};
exports.isValidApiKey = isValidApiKey;
const isValidTrackingId = (tracking) => {
    return typeof tracking === 'string' && tracking.length > 0 && tracking.length <= 255;
};
exports.isValidTrackingId = isValidTrackingId;
// Performance utilities
const measureTime = (fn) => {
    const start = Date.now();
    const result = fn();
    const duration = Date.now() - start;
    return { result, duration };
};
exports.measureTime = measureTime;
const measureTimeAsync = async (fn) => {
    const start = Date.now();
    const result = await fn();
    const duration = Date.now() - start;
    return { result, duration };
};
exports.measureTimeAsync = measureTimeAsync;
// Network utilities
const getClientIP = (req) => {
    return req.headers['x-forwarded-for']?.split(',')[0] ||
        req.headers['x-real-ip'] ||
        req.connection?.remoteAddress ||
        req.socket?.remoteAddress ||
        req.ip ||
        'unknown';
};
exports.getClientIP = getClientIP;
const getUserAgent = (req) => {
    return req.headers['user-agent'] || 'unknown';
};
exports.getUserAgent = getUserAgent;
// Error utilities
class XafraError extends Error {
    code;
    statusCode;
    details;
    constructor(message, code, statusCode = 500, details) {
        super(message);
        this.code = code;
        this.statusCode = statusCode;
        this.details = details;
        this.name = 'XafraError';
    }
}
exports.XafraError = XafraError;
const createError = (message, code, statusCode = 500, details) => {
    return new XafraError(message, code, statusCode, details);
};
exports.createError = createError;
// Retry utilities
const retry = async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error;
            if (attempt === maxAttempts) {
                throw lastError;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
    throw lastError;
};
exports.retry = retry;
// Rate limiting utilities
const createRateLimiter = (maxRequests, windowMs) => {
    const requests = new Map();
    return (identifier) => {
        const now = Date.now();
        const windowStart = now - windowMs;
        // Clean old entries
        for (const [key, value] of requests.entries()) {
            if (value.resetTime < windowStart) {
                requests.delete(key);
            }
        }
        const current = requests.get(identifier) || { count: 0, resetTime: now + windowMs };
        if (current.resetTime < now) {
            current.count = 1;
            current.resetTime = now + windowMs;
        }
        else {
            current.count++;
        }
        requests.set(identifier, current);
        return {
            allowed: current.count <= maxRequests,
            remaining: Math.max(0, maxRequests - current.count),
            resetTime: current.resetTime
        };
    };
};
exports.createRateLimiter = createRateLimiter;
// Math utilities for conversion rates
const calculateConversionRate = (conversions, totalClicks) => {
    if (totalClicks === 0)
        return 0;
    return Math.round((conversions / totalClicks) * 10000) / 10000; // 4 decimal places
};
exports.calculateConversionRate = calculateConversionRate;
const calculateWeightedDistribution = (conversionRates) => {
    const total = conversionRates.reduce((sum, rate) => sum + rate, 0);
    if (total === 0) {
        // Equal distribution if no conversion data
        const equalWeight = 1 / conversionRates.length;
        return conversionRates.map(() => equalWeight);
    }
    return conversionRates.map(rate => rate / total);
};
exports.calculateWeightedDistribution = calculateWeightedDistribution;
// Configuration utilities
const getEnvVar = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && !defaultValue) {
        throw new Error(`Environment variable ${name} is required`);
    }
    return value || defaultValue;
};
exports.getEnvVar = getEnvVar;
const getEnvVarAsNumber = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    const parsed = parseInt(value || defaultValue.toString(), 10);
    if (isNaN(parsed)) {
        throw new Error(`Environment variable ${name} must be a valid number`);
    }
    return parsed;
};
exports.getEnvVarAsNumber = getEnvVarAsNumber;
const getEnvVarAsBoolean = (name, defaultValue) => {
    const value = process.env[name];
    if (!value && defaultValue === undefined) {
        throw new Error(`Environment variable ${name} is required`);
    }
    if (!value)
        return defaultValue;
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};
exports.getEnvVarAsBoolean = getEnvVarAsBoolean;
//# sourceMappingURL=index.js.map