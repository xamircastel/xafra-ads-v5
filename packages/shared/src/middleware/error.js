"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestLogger = exports.notFoundHandler = exports.errorHandler = void 0;
const index_js_1 = require("../logger/index.js");
const errorHandler = (error, req, res, next) => {
    index_js_1.logger.error('Unhandled error', {
        error: error.message,
        stack: error.stack,
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: req.body
    });
    // Don't leak error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    res.status(500).json({
        error: 'Internal server error',
        ...(isDevelopment && { details: error.message, stack: error.stack })
    });
};
exports.errorHandler = errorHandler;
const notFoundHandler = (req, res) => {
    index_js_1.logger.warn('Route not found', {
        url: req.url,
        method: req.method,
        ip: req.ip
    });
    res.status(404).json({
        error: 'Route not found',
        path: req.url,
        method: req.method
    });
};
exports.notFoundHandler = notFoundHandler;
const requestLogger = (req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        index_js_1.logger.info('Request completed', {
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            ip: req.ip,
            userAgent: req.get('User-Agent')
        });
    });
    next();
};
exports.requestLogger = requestLogger;
//# sourceMappingURL=error.js.map