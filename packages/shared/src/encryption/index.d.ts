export interface EncryptedData {
    data: string;
    iv: string;
    tag: string;
    salt: string;
}
export declare class EncryptionService {
    private readonly secretKey;
    private readonly algorithm;
    private static readonly defaultSecretKey;
    constructor(secretKey: string);
    static encrypt(data: string): string;
    static decrypt(encryptedString: string): string;
    encryptData(data: string): EncryptedData;
    decryptData(encryptedData: EncryptedData): string;
}
export declare const getEncryptionService: () => EncryptionService;
//# sourceMappingURL=index.d.ts.map