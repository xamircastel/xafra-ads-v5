"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getEncryptionService = exports.EncryptionService = void 0;
const crypto_1 = require("crypto");
class EncryptionService {
    constructor(secretKey) {
        this.secretKey = secretKey;
        this.algorithm = 'aes-256-cbc';
        if (!secretKey || secretKey.length < 32) {
            throw new Error('Encryption key must be at least 32 characters long');
        }
    }
    // Static methods for easy usage
    static encrypt(data) {
        const service = new EncryptionService(this.defaultSecretKey);
        const encrypted = service.encryptData(data);
        return Buffer.from(JSON.stringify(encrypted)).toString('base64');
    }
    static decrypt(encryptedString) {
        const service = new EncryptionService(this.defaultSecretKey);
        const encryptedData = JSON.parse(Buffer.from(encryptedString, 'base64').toString());
        return service.decryptData(encryptedData);
    }
    // Simple encrypt/decrypt for general data
    encryptData(data) {
        const salt = crypto_1.randomBytes(16);
        const iv = crypto_1.randomBytes(16);
        const key = crypto_1.pbkdf2Sync(this.secretKey, salt, 10000, 32, 'sha512');
        const cipher = crypto_1.createCipheriv(this.algorithm, key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        return {
            data: encrypted,
            iv: iv.toString('hex'),
            tag: '', // Not used for CBC
            salt: salt.toString('hex')
        };
    }
    decryptData(encryptedData) {
        const salt = Buffer.from(encryptedData.salt, 'hex');
        const iv = Buffer.from(encryptedData.iv, 'hex');
        const key = crypto_1.pbkdf2Sync(this.secretKey, salt, 10000, 32, 'sha512');
        const decipher = crypto_1.createDecipheriv(this.algorithm, key, iv);
        let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
}
exports.EncryptionService = EncryptionService;
EncryptionService.defaultSecretKey = process.env['ENCRYPTION_KEY'] || 'default-secret-key-for-development-only-change-in-production';
// Singleton instance
let encryptionService;
const getEncryptionService = () => {
    if (!encryptionService) {
        const key = process.env['ENCRYPTION_KEY'];
        if (!key) {
            throw new Error('ENCRYPTION_KEY environment variable is required');
        }
        encryptionService = new EncryptionService(key);
    }
    return encryptionService;
};
exports.getEncryptionService = getEncryptionService;
