import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { sanitizeFileName } from '../../utils/fileValidation.js';

/**
 * Local Disk Storage Provider for development and local testing.
 * Implements the Neev Storage Provider Interface.
 */
export class LocalStorageProvider {
  constructor(options = {}) {
    this.name = 'local';
    this.baseDir = options.baseDir || process.env.STORAGE_LOCAL_DIR || path.join(process.cwd(), 'uploads', 'answer-sheets');
    this.ensureDirectoryExists(this.baseDir);
  }

  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * Generates a collision-free safe internal storage key.
   * Format: <timestamp>-<uuid>-<sanitized-original-name>
   */
  generateKey(originalName, prefix = '') {
    const safeName = sanitizeFileName(originalName);
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const key = `${timestamp}-${uuid}-${safeName}`;
    return prefix ? `${prefix}/${key}` : key;
  }

  resolvePath(storageKey) {
    // Prevent directory traversal
    const safeKey = path.normalize(storageKey).replace(/^(\.\.(\/|\\|$))+/, '');
    return path.join(this.baseDir, safeKey);
  }

  /**
   * Saves a file buffer to disk.
   */
  async saveFile({ buffer, originalName, mimeType, prefix = '' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('A valid file Buffer is required to save file.');
    }

    const storageKey = this.generateKey(originalName, prefix);
    const targetPath = this.resolvePath(storageKey);
    this.ensureDirectoryExists(path.dirname(targetPath));

    await fs.promises.writeFile(targetPath, buffer);

    return {
      storageKey,
      storageProvider: this.name,
      fileSize: buffer.length,
      mimeType,
    };
  }

  /**
   * Retrieves a readable stream for authenticated file streaming/preview.
   */
  getFileStream(storageKey) {
    const targetPath = this.resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found at storage key: ${storageKey}`);
    }
    return fs.createReadStream(targetPath);
  }

  /**
   * Retrieves full file buffer.
   */
  async getFileBuffer(storageKey) {
    const targetPath = this.resolvePath(storageKey);
    if (!fs.existsSync(targetPath)) {
      throw new Error(`File not found at storage key: ${storageKey}`);
    }
    return fs.promises.readFile(targetPath);
  }

  /**
   * Deletes a file safely from disk.
   */
  async deleteFile(storageKey) {
    try {
      const targetPath = this.resolvePath(storageKey);
      if (fs.existsSync(targetPath)) {
        await fs.promises.unlink(targetPath);
        return true;
      }
      return false;
    } catch (err) {
      console.warn(`[LocalStorage] Failed to delete file at ${storageKey}:`, err.message);
      return false;
    }
  }
}

export default LocalStorageProvider;

