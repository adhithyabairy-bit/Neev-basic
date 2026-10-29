import LocalStorageProvider from './localStorageProvider.js';
import FirebaseStorageProvider from './firebaseStorageProvider.js';
import S3StorageProvider from './s3StorageProvider.js';

/**
 * Storage Service Factory
 * Instantiates the appropriate storage provider according to STORAGE_PROVIDER env var.
 *
 * Supported Cloud & Local Providers:
 * - 'firebase': Firebase Cloud Storage (Google Cloud Storage, 5 GB Free Tier)
 * - 'filebase': Filebase S3-Compatible Object Storage (5 GB Free Tier, Free Egress)
 * - 'r2': Cloudflare R2 (10 GB Free Tier, Free Egress)
 * - 's3': Generic AWS S3
 * - 'local': Local disk storage (development & offline testing)
 */
class StorageService {
  constructor() {
    this.provider = this.createProvider();
  }

  createProvider() {
    const providerType = (process.env.STORAGE_PROVIDER || 'firebase').toLowerCase();

    switch (providerType) {
      case 'firebase':
        return new FirebaseStorageProvider();
      case 'filebase':
      case 'r2':
      case 's3':
        return new S3StorageProvider({ providerType });
      case 'local':
      default:
        return new LocalStorageProvider();
    }
  }

  /**
   * Set a custom provider instance (useful for testing or dynamic swapping).
   */
  setProvider(provider) {
    this.provider = provider;
  }

  getProviderName() {
    return this.provider?.name || 'unknown';
  }

  isConfigured() {
    if (this.provider?.isConfigured) {
      return this.provider.isConfigured();
    }
    return true; // Local provider is always configured
  }

  async verifyConnection() {
    if (this.provider?.verifyConnection) {
      return this.provider.verifyConnection();
    }
    return {
      connected: true,
      provider: this.getProviderName(),
      mode: 'local_disk',
    };
  }

  async saveFile(params) {
    return this.provider.saveFile(params);
  }

  getFileStream(storageKey) {
    return this.provider.getFileStream(storageKey);
  }

  async getFileBuffer(storageKey) {
    return this.provider.getFileBuffer(storageKey);
  }

  async deleteFile(storageKey) {
    return this.provider.deleteFile(storageKey);
  }

  async getPresignedDownloadUrl(storageKey, expiresIn = 900) {
    if (typeof this.provider.getPresignedDownloadUrl === 'function') {
      return this.provider.getPresignedDownloadUrl(storageKey, expiresIn);
    }
    // Local provider fallback
    return `/api/storage/file/${encodeURIComponent(storageKey)}`;
  }

  async getPresignedUploadUrl(params) {
    if (typeof this.provider.getPresignedUploadUrl === 'function') {
      return this.provider.getPresignedUploadUrl(params);
    }
    throw new Error(
      `Presigned upload URLs are only supported by cloud object storage providers (firebase, filebase, r2, s3).`
    );
  }
}

export const storageService = new StorageService();
export default storageService;
