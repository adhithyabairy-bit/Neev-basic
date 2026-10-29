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
    this.initError = null;
    try {
      this.provider = this.createProvider();
    } catch (err) {
      this.provider = null;
      this.initError = err;
    }
  }

  ensureProvider() {
    if (this.initError) {
      throw this.initError;
    }
    if (!this.provider) {
      this.provider = this.createProvider();
    }
    return this.provider;
  }

  createProvider() {
    const isProduction = process.env.NODE_ENV === 'production';
    const providerType = (process.env.STORAGE_PROVIDER || (isProduction ? '' : 'local')).toLowerCase();

    if (isProduction && (!providerType || providerType === 'local')) {
      throw new Error(
        'PRODUCTION_STORAGE_UNCONFIGURED: Local storage is prohibited in production. A cloud object storage provider (filebase, r2, firebase, or s3) must be configured.'
      );
    }

    let provider;
    switch (providerType) {
      case 'firebase':
        provider = new FirebaseStorageProvider();
        break;
      case 'filebase':
      case 'r2':
      case 's3':
        provider = new S3StorageProvider({ providerType });
        break;
      case 'local':
      default:
        if (isProduction) {
          throw new Error(
            `PRODUCTION_STORAGE_UNCONFIGURED: Provider '${providerType}' is not a valid cloud storage provider in production.`
          );
        }
        provider = new LocalStorageProvider();
        break;
    }

    if (isProduction && typeof provider.isConfigured === 'function' && !provider.isConfigured()) {
      throw new Error(
        `PRODUCTION_STORAGE_UNCONFIGURED: Cloud storage provider '${providerType}' is missing required environment credentials.`
      );
    }

    return provider;
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
    if (this.initError) return false;
    if (this.provider?.isConfigured) {
      return this.provider.isConfigured();
    }
    return true; // Local provider is always configured
  }

  async verifyConnection() {
    if (this.initError) {
      return {
        connected: false,
        reason: this.initError.message,
      };
    }
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
    return this.ensureProvider().saveFile(params);
  }

  getFileStream(storageKey) {
    return this.ensureProvider().getFileStream(storageKey);
  }

  async getFileBuffer(storageKey) {
    return this.ensureProvider().getFileBuffer(storageKey);
  }

  async deleteFile(storageKey) {
    return this.ensureProvider().deleteFile(storageKey);
  }

  async getPresignedDownloadUrl(storageKey, expiresIn = 900) {
    const provider = this.ensureProvider();
    if (typeof provider.getPresignedDownloadUrl === 'function') {
      return provider.getPresignedDownloadUrl(storageKey, expiresIn);
    }
    // Local provider fallback
    return `/api/storage/file/${encodeURIComponent(storageKey)}`;
  }

  generateKey(originalName, prefix = '') {
    const provider = this.provider || this.ensureProvider();
    if (typeof provider?.generateKey === 'function') {
      return provider.generateKey(originalName, prefix);
    }
    const cleanName = String(originalName || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const key = `${timestamp}-${cleanName}`;
    return prefix ? `${prefix}/${key}` : key;
  }

  async getPresignedUploadUrl(params) {
    const provider = this.ensureProvider();
    if (typeof provider.getPresignedUploadUrl === 'function') {
      return provider.getPresignedUploadUrl(params);
    }
    throw new Error(
      `Presigned upload URLs are only supported by cloud object storage providers (firebase, filebase, r2, s3). Provider '${this.getProviderName()}' does not implement getPresignedUploadUrl.`
    );
  }

  async verifyUploadedObject(storageKey) {
    const provider = this.ensureProvider();
    if (typeof provider.verifyUploadedObject === 'function') {
      return provider.verifyUploadedObject(storageKey);
    }
    throw new Error(
      `Object verification is only supported by cloud object storage providers (firebase, filebase, r2, s3). Provider '${this.getProviderName()}' does not implement verifyUploadedObject.`
    );
  }
}

export const storageService = new StorageService();
export default storageService;
