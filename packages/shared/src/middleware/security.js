"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimitByIP = exports.securityMiddleware = void 0;
const helmet_1 = __importDefault(require("helmet"));
const compression_1 = __importDefault(require("compression"));
const cors_1 = __importDefault(require("cors"));
exports.securityMiddleware = [
    // CORS configuration
    (0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key']
    }),
    // Security headers
    (0, helmet_1.default)({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'"],
                fontSrc: ["'self'"],
                objectSrc: ["'none'"],
                mediaSrc: ["'self'"],
                frameSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false,
    }),
    // Compression
    (0, compression_1.default)({
        filter: (req, res) => {
            if (req.headers['x-no-compression']) {
                return false;
            }
            return compression_1.default.filter(req, res);
        },
        threshold: 1024
    })
];
const rateLimitByIP = (windowMs, max) => {
    const requests = new Map();
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowStart = now - windowMs;
        // Clean old entries
        for (const [key, value] of requests.entries()) {
            if (value.resetTime < windowStart) {
                requests.delete(key);
            }
        }
        const current = requests.get(ip) || { count: 0, resetTime: now + windowMs };
        if (current.resetTime < now) {
            current.count = 1;
            current.resetTime = now + windowMs;
        }
        else {
            current.count++;
        }
        requests.set(ip, current);
        if (current.count > max) {
            res.status(429).json({
                error: 'Too many requests',
                retryAfter: Math.ceil((current.resetTime - now) / 1000)
            });
            return;
        }
        res.setHeader('X-RateLimit-Limit', max);
        res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current.count));
        res.setHeader('X-RateLimit-Reset', Math.ceil(current.resetTime / 1000));
        next();
    };
};
exports.rateLimitByIP = rateLimitByIP;
//# sourceMappingURL=security.js.map