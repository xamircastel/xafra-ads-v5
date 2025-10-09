"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = exports.authenticate = void 0;
const index_js_1 = require("../logger/index.js");
const authenticate = async (req, res, next) => {
    try {
        const apiKey = req.headers['x-api-key'] || req.params.apikey;
        if (!apiKey) {
            res.status(401).json({ error: 'API key required' });
            return;
        }
        // TODO: Validate API key against database
        // For now, we'll store it in the request
        req.apiKey = apiKey;
        index_js_1.logger.info('Authentication successful', { apiKey: apiKey.substring(0, 8) + '...' });
        next();
    }
    catch (error) {
        index_js_1.logger.error('Authentication failed', error);
        res.status(401).json({ error: 'Invalid API key' });
    }
};
exports.authenticate = authenticate;
const validateRequest = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({
                    error: 'Validation failed',
                    details: result.error.errors
                });
                return;
            }
            next();
        }
        catch (error) {
            index_js_1.logger.error('Request validation failed', error);
            res.status(400).json({ error: 'Invalid request format' });
        }
    };
};
exports.validateRequest = validateRequest;
//# sourceMappingURL=auth.js.map