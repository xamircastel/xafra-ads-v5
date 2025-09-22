// Simple encryption service replacement for @xafra/shared/encryption

import crypto from 'crypto';

export class EncryptionService {
  private static readonly SECRET_KEY = process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
  private static readonly ALGORITHM = 'aes-256-cbc';

  static encrypt(data: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.ALGORITHM, this.SECRET_KEY);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  }

  static decrypt(encryptedData: string): string {
    try {
      const decipher = crypto.createDecipher(this.ALGORITHM, this.SECRET_KEY);
      let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  }
}