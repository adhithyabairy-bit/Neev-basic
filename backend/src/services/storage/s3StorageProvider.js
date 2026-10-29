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
 * Universal S3-Compatible Cloud Storage Provider
 * Supports:
 * - Filebase (5 GB Free Tier S3-compatible: https://s3.filebase.com)
 * - Cloudflare R2 (10 GB Free Tier: https://<account_id>.r2.cloudflarestorage.com)
 * - AWS S3 / MinIO
 */
export class S3StorageProvider {
  constructor(options = {}) {
    this.providerType = (options.providerType || process.env.STORAGE_PROVIDER || 'filebase').toLowerCase();
    this.name = this.providerType;

    // Detect endpoint and credentials according to provider subtype
    if (this.providerType === 'filebase') {
      this.endpoint = options.endpoint || process.env.FILEBASE_ENDPOINT || 'https://s3.filebase.io';
      this.accessKeyId = options.accessKeyId || process.env.FILEBASE_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID;
      this.secretAccessKey = options.secretAccessKey || process.env.FILEBASE_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY;
      this.bucketName = options.bucketName || process.env.FILEBASE_BUCKET_NAME || process.env.S3_BUCKET_NAME;
      this.region = options.region || 'us-east-1';
    } else if (this.providerType === 'r2') {
      const accountId = options.accountId || process.env.R2_ACCOUNT_ID;
      this.endpoint = options.endpoint || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
      this.accessKeyId = options.accessKeyId || process.env.R2_ACCESS_KEY_ID;
      this.secretAccessKey = options.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
      this.bucketName = options.bucketName || process.env.R2_BUCKET_NAME;
      this.region = options.region || 'auto';
    } else {
      // Generic S3
      this.endpoint = options.endpoint || process.env.S3_ENDPOINT;
      this.accessKeyId = options.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
      this.secretAccessKey = options.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;
      this.bucketName = options.bucketName || process.env.S3_BUCKET_NAME;
      this.region = options.region || process.env.AWS_REGION || 'us-east-1';
    }

    if (this.isConfigured()) {
      const clientConfig = {
        region: this.region,
        credentials: {
          accessKeyId: this.accessKeyId,
          secretAccessKey: this.secretAccessKey,
        },
      };
      if (this.endpoint) {
        clientConfig.endpoint = this.endpoint;
        clientConfig.forcePathStyle = true;
      }
      if (this.providerType === 'filebase') {
        clientConfig.forcePathStyle = true;
      }
      this.client = new S3Client(clientConfig);
    } else {
      this.client = null;
    }
  }

  isConfigured() {
    return Boolean(
      this.accessKeyId &&
      this.secretAccessKey &&
      this.bucketName
    );
  }

  ensureClient() {
    if (!this.client || !this.isConfigured()) {
      throw new Error(
        `S3_STORAGE_NOT_CONFIGURED: Cloud credentials for '${this.providerType}' (accessKey, secretKey, bucketName) are not fully configured.`
      );
    }
    return this.client;
  }

  generateKey(originalName, prefix = '') {
    const safeName = sanitizeFileName(originalName);
    const uuid = crypto.randomUUID();
    const timestamp = Date.now();
    const key = `${timestamp}-${uuid}-${safeName}`;
    return prefix ? `${prefix}/${key}` : key;
  }

  async saveFile({ buffer, originalName, mimeType = 'application/pdf', prefix = '' }) {
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('A valid file Buffer is required to upload to cloud storage.');
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

  async getFileStream(storageKey) {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    const response = await client.send(command);
    return response.Body;
  }

  async getPresignedDownloadUrl(storageKey, expiresIn = 900) {
    const client = this.ensureClient();

    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
    });

    return getSignedUrl(client, command, { expiresIn });
  }

  /**
   * Generates a short-lived presigned upload URL for direct browser PUT upload.
   * Default expiration: 15 minutes (900 seconds).
   */
  async getPresignedUploadUrl({ storageKey, mimeType = 'application/pdf', expiresIn = 900 }) {
    if (!storageKey) {
      throw new Error('A storageKey is required to generate a presigned upload URL.');
    }

    const client = this.ensureClient();

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: storageKey,
      ContentType: mimeType,
    });

    const uploadUrl = await getSignedUrl(client, command, { expiresIn });

    return {
      uploadUrl,
      storageKey,
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
   * Confirms existence, content length, and MIME type without downloading the file.
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
      console.warn(`[S3Storage] Failed to delete file at key ${storageKey}:`, err.message);
      return false;
    }
  }

  async verifyConnection() {
    if (!this.isConfigured()) {
      return {
        connected: false,
        reason: `S3 storage for '${this.providerType}' is not configured (missing accessKey, secretKey, or bucketName).`,
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
        provider: this.name,
      };
    } catch (err) {
      return {
        connected: false,
        reason: `S3 storage connection failed for '${this.providerType}': ${err.message}`,
      };
    }
  }
}

export default S3StorageProvider;

