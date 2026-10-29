import admin from 'firebase-admin';
import crypto from 'crypto';
import { sanitizeFileName } from '../../utils/fileValidation.js';

/**
 * Firebase Cloud Storage Provider
 *
 * Stores original syllabus PDFs and student answer sheets in Google Cloud Storage
 * via the Firebase Admin SDK.
 *
 * Free Tier Allowance (Spark Plan):
 * - 5 GB total storage
 * - 1 GB/day download bandwidth
 * - 20,000 upload ops/day, 50,000 download ops/day
 */
export class FirebaseStorageProvider {
  constructor(options = {}) {
    this.name = 'firebase';
    this.projectId = options.projectId || process.env.FIREBASE_PROJECT_ID;
    this.bucketName =
      options.bucketName ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      (this.projectId ? `${this.projectId}.firebasestorage.app` : null) ||
      (this.projectId ? `${this.projectId}.appspot.com` : null);
  }

  isConfigured() {
    return Boolean(admin.apps && admin.apps.length > 0 && this.bucketName);
  }

  getBucket() {
    if (!this.isConfigured()) {
      throw new Error(
        'FIREBASE_STORAGE_NOT_CONFIGURED: Firebase Admin is not initialized or FIREBASE_STORAGE_BUCKET is not set.'
      );
    }
    return admin.storage().bucket(this.bucketName);
  }

  /**
   * Generates a collision-free safe internal storage key.
   */
  generateKey(originalName, prefix = '') {
    const safeName = sanitizeFileName(originalName);
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const key = `${timestamp}-${uuid}-${safeName}`;
    return prefix ? `${prefix}/${key}` : key;
  }

  /**
   * Saves a file buffer to private Firebase Cloud Storage.
   */
  async saveFile({ buffer, originalName, mimeType = 'application/pdf', prefix = '' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('A valid file Buffer is required to save file in Firebase Cloud Storage.');
    }

    const bucket = this.getBucket();
    const storageKey = this.generateKey(originalName, prefix);
    const file = bucket.file(storageKey);

    await file.save(buffer, {
      metadata: {
        contentType: mimeType,
        metadata: {
          originalName: encodeURIComponent(originalName),
          uploadedAt: new Date().toISOString(),
        },
      },
      resumable: false,
    });

    return {
      storageKey,
      storageProvider: this.name,
      fileSize: buffer.length,
      mimeType,
      bucket: this.bucketName,
    };
  }

  /**
   * Retrieves full file buffer from Firebase Storage.
   */
  async getFileBuffer(storageKey) {
    const bucket = this.getBucket();
    const file = bucket.file(storageKey);
    const [buffer] = await file.download();
    return buffer;
  }

  /**
   * Retrieves a readable stream for authenticated file streaming/preview.
   */
  getFileStream(storageKey) {
    const bucket = this.getBucket();
    const file = bucket.file(storageKey);
    return file.createReadStream();
  }

  /**
   * Generates a short-lived presigned download URL for authorized teacher preview.
   * Default expiration: 15 minutes (900 seconds).
   */
  async getPresignedDownloadUrl(storageKey, expiresIn = 900) {
    const bucket = this.getBucket();
    const file = bucket.file(storageKey);

    const [url] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + expiresIn * 1000,
    });

    return url;
  }

  /**
   * Deletes a file safely from Firebase Storage.
   */
  async deleteFile(storageKey) {
    if (!this.isConfigured()) return false;
    try {
      const bucket = this.getBucket();
      const file = bucket.file(storageKey);
      await file.delete();
      return true;
    } catch (err) {
      console.warn(`[FirebaseStorage] Failed to delete file at ${storageKey}:`, err.message);
      return false;
    }
  }

  /**
   * Verifies Firebase Storage bucket connectivity without claiming success falsely.
   */
  async verifyConnection() {
    if (!this.isConfigured()) {
      return {
        connected: false,
        reason: 'Firebase Storage is not configured. Set FIREBASE_PROJECT_ID and FIREBASE_STORAGE_BUCKET.',
      };
    }

    try {
      const bucket = this.getBucket();
      const [exists] = await bucket.exists();
      return {
        connected: exists,
        provider: 'firebase',
        bucket: this.bucketName,
      };
    } catch (err) {
      return {
        connected: false,
        reason: `Firebase Storage check failed: ${err.message}`,
      };
    }
  }
}

export default FirebaseStorageProvider;

