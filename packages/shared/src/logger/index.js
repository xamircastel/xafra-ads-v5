"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loggers = exports.performanceLogger = exports.logger = void 0;
const winston_1 = __importDefault(require("winston"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    debug: 'white',
};
winston_1.default.addColors(colors);
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const transports = [
    new winston_1.default.transports.Console({
        format: winston_1.default.format.combine(winston_1.default.format.colorize(), winston_1.default.format.simple())
    }),
    new winston_1.default.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    }),
    new winston_1.default.transports.File({
        filename: 'logs/combined.log',
        format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.json())
    }),
];
exports.logger = winston_1.default.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    levels,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.json()),
    defaultMeta: {
        service: process.env.SERVICE_NAME || 'xafra-service',
        version: process.env.SERVICE_VERSION || '1.0.0'
    },
    transports,
});
exports.performanceLogger = {
    track: (operation, startTime, metadata) => {
        const duration = Date.now() - startTime;
        exports.logger.info(`Performance: ${operation}`, {
            operation,
            duration,
            ...metadata
        });
        if (operation.includes('redirect') && duration > 50) {
            exports.logger.warn(`Slow redirect detected: ${duration}ms`, {
                operation,
                duration,
                ...metadata
            });
        }
        return duration;
    }
};
exports.loggers = {
    request: (method, url, statusCode, duration, metadata) => {
        exports.logger.info('HTTP Request', {
            method,
            url,
            statusCode,
            duration,
            ...metadata
        });
    },
    database: (operation, table, duration, metadata) => {
        exports.logger.debug('Database Operation', {
            operation,
            table,
            duration,
            ...metadata
        });
    },
    tracking: (action, trackingId, productId, metadata) => {
        exports.logger.info('Tracking Event', {
            action,
            trackingId,
            productId,
            ...metadata
        });
    },
    auth: (event, apikey, customerId, metadata) => {
        exports.logger.info('Auth Event', {
            event,
            apikey,
            customerId,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    },
    security: (event, ip, metadata) => {
        exports.logger.warn('Security Event', {
            event,
            ip,
            timestamp: new Date().toISOString(),
            ...metadata
        });
    },
    error: (message, error, metadata) => {
        exports.logger.error(message, {
            error: error.message,
            stack: error.stack,
            ...metadata
        });
    }
};
//# sourceMappingURL=index.js.map