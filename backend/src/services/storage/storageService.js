import LocalStorageProvider from './localStorageProvider.js';

/**
 * Storage Service Factory
 * Instantiates the appropriate storage provider according to STORAGE_PROVIDER env var.
 * Supported: 'local' (development), with pluggable interface for 's3', 'gcs', 'firebase'.
 */
class StorageService {
  constructor() {
    this.provider = this.createProvider();
  }

  createProvider() {
    const providerType = (process.env.STORAGE_PROVIDER || 'local').toLowerCase();

    switch (providerType) {
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
}

export const storageService = new StorageService();
export default storageService;

