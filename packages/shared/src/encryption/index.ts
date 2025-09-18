const crypto = require('crypto');

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
  salt: string;
}

export class EncryptionService {
  private readonly algorithm = 'aes-256-cbc';
  
  private static readonly defaultSecretKey = process.env['ENCRYPTION_KEY'] || 'default-secret-key-for-development-only-change-in-production';

  constructor(private readonly secretKey: string) {
    if (!secretKey || secretKey.length < 32) {
      throw new Error('Encryption key must be at least 32 characters long');
    }
  }

  // Static methods for easy usage
  static encrypt(data: string): string {
    const service = new EncryptionService(this.defaultSecretKey);
    const encrypted = service.encryptData(data);
    return Buffer.from(JSON.stringify(encrypted)).toString('base64');
  }

  static decrypt(encryptedString: string): string {
    const service = new EncryptionService(this.defaultSecretKey);
    const encryptedData = JSON.parse(Buffer.from(encryptedString, 'base64').toString());
    return service.decryptData(encryptedData);
  }

  // Simple encrypt/decrypt for general data
  encryptData(data: string): EncryptedData {
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);
    const key = crypto.pbkdf2Sync(this.secretKey, salt, 10000, 32, 'sha512');

    const cipher = crypto.createCipheriv(this.algorithm, key, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: '', // Not used for CBC
      salt: salt.toString('hex')
    };
  }

  decryptData(encryptedData: EncryptedData): string {
    const salt = Buffer.from(encryptedData.salt, 'hex');
    const iv = Buffer.from(encryptedData.iv, 'hex');
    const key = crypto.pbkdf2Sync(this.secretKey, salt, 10000, 32, 'sha512');

    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

// Singleton instance
let encryptionService: EncryptionService;

export const getEncryptionService = (): EncryptionService => {
  if (!encryptionService) {
    const key = process.env['ENCRYPTION_KEY'];
    if (!key) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    encryptionService = new EncryptionService(key);
  }
  return encryptionService;
};