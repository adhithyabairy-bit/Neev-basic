import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { sanitizeFileName } from '../../utils/fileValidation.js';

/**
 * Cloudflare R2 / S3-Compatible Cloud Object Storage Provider
 *
 * Implements private object storage, authenticated streaming,
 * short-lived presigned download URLs, and collision-free key generation.
 * Zero-egress fee architecture aligned with zero-budget-first requirements.
 */
export class R2StorageProvider {
  constructor(options = {}) {
    this.name = 'r2';
    this.accountId = options.accountId || process.env.R2_ACCOUNT_ID;
    this.accessKeyId = options.accessKeyId || process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = options.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    this.bucketName = options.bucketName || process.env.R2_BUCKET_NAME || 'neev-syllabus-prod';
    this.region = options.region || process.env.R2_REGION || 'auto';

    if (this.isConfigured()) {
      this.client = new S3Client({
        region: this.region,
        endpoint: `https://${this.accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      });
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(
      this.accountId &&
      this.accessKeyId &&
      this.secretAccessKey &&
      this.bucketName
    );
  }

  ensureClient() {
    if (!this.client || !this.isConfigured()) {
      throw new Error(
        'R2_NOT_CONFIGURED: Cloudflare R2 cloud credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not fully configured in environment variables.'
      );
    }
    return this.client;
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
   * Saves a file buffer to private cloud storage in R2.
   */
  async saveFile({ buffer, originalName, mimeType = 'application/pdf', prefix = '' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('A valid file Buffer is required to upload to R2 cloud storage.');
    }

    const client = this.ensureClient();
    const storageKey = this.generateKey(originalName, prefix);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      Body: buffer,
      ContentType: mimeType,
      Metadata: {
        originalName: encodeURIComponent(originalName),
        uploadedAt: new Date().toISOString(),
      },
    });

    await client.send(command);

    return {
      storageKey,
      storageProvider: this.name,
      fileSize: buffer.length,
      mimeType,
      bucket: this.bucketName,
    };
  }

  /**
   * Retrieves full file buffer from R2 cloud storage.
   */
  async getFileBuffer(storageKey) {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await client.send(command);
    const byteArray = await response.Body.transformToByteArray();
    return Buffer.from(byteArray);
  }

  /**
   * Retrieves a readable stream for authenticated file streaming/preview.
   */
  async getFileStream(storageKey) {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await client.send(command);
    return response.Body;
  }

  /**
   * Generates a short-lived presigned download URL for authorized teacher preview.
   * Default expiration: 15 minutes (900 seconds). Never public.
   */
  async getPresignedDownloadUrl(storageKey, expiresIn = 900) {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return getSignedUrl(client, command, { expiresIn });
  }

  /**
   * Generates a short-lived presigned upload URL for direct client-to-R2 upload.
   * Default expiration: 15 minutes (900 seconds).
   */
  async getPresignedUploadUrl({ storageKey, originalName, mimeType = 'application/pdf', prefix = '', expiresIn = 900 }) {
    const client = this.ensureClient();
    const finalKey = storageKey || this.generateKey(originalName, prefix);

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: finalKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return {
      uploadUrl,
      storageKey: finalKey,
      storageProvider: this.name,
      bucket: this.bucketName,
      method: 'PUT',
      expiresInSeconds: expiresIn,
      headers: {
        'Content-Type': mimeType,
      },
    };
  }

  /**
   * Verifies an uploaded cloud object via HeadObjectCommand.
   */
  async verifyUploadedObject(storageKey) {
    if (!storageKey) {
      throw new Error('A storageKey is required to verify an uploaded cloud object.');
    }

    const client = this.ensureClient();

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });

      const response = await client.send(command);

      return {
        exists: true,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        etag: response.ETag || '',
        lastModified: response.LastModified || new Date(),
        storageProvider: this.name,
        bucket: this.bucketName,
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.name === 'NoSuchKey') {
        return {
          exists: false,
          error: 'OBJECT_NOT_FOUND',
          reason: `Object not found at key '${storageKey}' in bucket '${this.bucketName}'`,
        };
      }
      throw err;
    }
  }

  /**
   * Deletes a file safely from R2 cloud storage.
   */
  async deleteFile(storageKey) {
    if (!this.isConfigured()) return false;
    try {
      const client = this.ensureClient();
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: storageKey,
      });
      await client.send(command);
      return true;
    } catch (err) {
      console.warn(`[R2Storage] Failed to delete file at key ${storageKey}:`, err.message);
      return false;
    }
  }

  /**
   * Verifies R2 connection and bucket accessibility without claiming success falsely.
   */
  async verifyConnection() {
    if (!this.isConfigured()) {
      return {
        connected: false,
        reason: 'R2 credentials missing (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, or R2_BUCKET_NAME not set).',
      };
    }

    try {
      const client = this.ensureClient();
      const command = new HeadBucketCommand({
        Bucket: this.bucketName,
      });
      await client.send(command);
      return {
        connected: true,
        bucket: this.bucketName,
        provider: 'r2',
      };
    } catch (err) {
      return {
        connected: false,
        reason: `R2 connection failed: ${err.message}`,
      };
    }
  }
}

export default R2StorageProvider;

