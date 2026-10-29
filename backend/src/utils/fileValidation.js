/**
 * File Validation Utility for Neev Platform
 * Validates file sizes, extensions, MIME types, and magic bytes (file signatures).
 */

// Magic byte signatures for supported file formats
const FILE_SIGNATURES = {
  // PDF starts with %PDF- (0x25, 0x50, 0x44, 0x46)
  pdf: [0x25, 0x50, 0x44, 0x46],
  // JPEG starts with FF D8 FF
  jpeg: [0xff, 0xd8, 0xff],
  // PNG starts with 89 50 4E 47 0D 0A 1A 0A
  png: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
};

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
];

const ALLOWED_EXTENSIONS = ['.pdf', '.jpeg', '.jpg', '.png'];

/**
 * Validates the raw buffer against known magic byte signatures.
 * @param {Buffer} buffer - File buffer
 * @returns {'pdf' | 'jpeg' | 'png' | null} Detected file type or null if unrecognized
 */
export function detectFileSignature(buffer) {
  if (!buffer || !Buffer.isBuffer(buffer) || buffer.length < 8) {
    return null;
  }

  // Check PDF
  if (
    buffer[0] === FILE_SIGNATURES.pdf[0] &&
    buffer[1] === FILE_SIGNATURES.pdf[1] &&
    buffer[2] === FILE_SIGNATURES.pdf[2] &&
    buffer[3] === FILE_SIGNATURES.pdf[3]
  ) {
    return 'pdf';
  }

  // Check JPEG
  if (
    buffer[0] === FILE_SIGNATURES.jpeg[0] &&
    buffer[1] === FILE_SIGNATURES.jpeg[1] &&
    buffer[2] === FILE_SIGNATURES.jpeg[2]
  ) {
    return 'jpeg';
  }

  // Check PNG
  const isPng = FILE_SIGNATURES.png.every((byte, idx) => buffer[idx] === byte);
  if (isPng) {
    return 'png';
  }

  return null;
}

/**
 * Sanitizes original filenames to safe ASCII strings to prevent path traversal.
 * Never trust user-supplied filenames as filesystem paths.
 * @param {string} originalName - Original user-supplied filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFileName(originalName = 'document') {
  const baseName = originalName.replace(/^.*[\\/]/, ''); // remove any paths
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return sanitized.substring(0, 100) || 'document';
}

/**
 * Validates an uploaded file's size, extension, MIME type, and magic bytes.
 * @param {Object} file - Multer file object or { buffer, originalname, mimetype, size }
 * @param {number} maxSizeBytes - Maximum allowed size in bytes (defaults to 15MB)
 * @returns {{ valid: boolean, error?: string, code?: string, detectedType?: string }}
 */
export function validateUploadedFile(file, maxSizeBytes = 15 * 1024 * 1024) {
  if (!file) {
    return {
      valid: false,
      error: 'No file provided for validation.',
      code: 'FILE_MISSING',
    };
  }

  // Check empty file
  if (!file.size || file.size === 0 || !file.buffer || file.buffer.length === 0) {
    return {
      valid: false,
      error: `File '${file.originalname || 'document'}' is empty (0 bytes).`,
      code: 'FILE_EMPTY',
    };
  }

  // Check file size
  if (file.size > maxSizeBytes) {
    const maxMb = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `File '${file.originalname}' exceeds the maximum allowed size of ${maxMb}MB.`,
      code: 'FILE_TOO_LARGE',
    };
  }

  // Check extension
  const originalName = file.originalname || '';
  const lastDot = originalName.lastIndexOf('.');
  const ext = lastDot !== -1 ? originalName.substring(lastDot).toLowerCase() : '';

  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `File extension '${ext}' is not supported. Allowed extensions: PDF, JPG, JPEG, PNG.`,
      code: 'UNSUPPORTED_EXTENSION',
    };
  }

  // Check declared MIME type
  const mimeType = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `MIME type '${file.mimetype}' is not supported. Allowed types: application/pdf, image/jpeg, image/png.`,
      code: 'UNSUPPORTED_MIME_TYPE',
    };
  }

  // Verify actual file signature / magic bytes
  const detectedType = detectFileSignature(file.buffer);
  if (!detectedType) {
    return {
      valid: false,
      error: `File '${file.originalname}' does not have a valid PDF, JPEG, or PNG signature. Content does not match extension.`,
      code: 'INVALID_FILE_SIGNATURE',
    };
  }

  // Ensure detected signature matches declared extension
  if (detectedType === 'pdf' && ext !== '.pdf') {
    return {
      valid: false,
      error: `Mismatched file format: content is PDF but extension is '${ext}'.`,
      code: 'SIGNATURE_EXTENSION_MISMATCH',
    };
  }

  if ((detectedType === 'jpeg' || detectedType === 'png') && ext === '.pdf') {
    return {
      valid: false,
      error: `Mismatched file format: content is image but extension is '${ext}'.`,
      code: 'SIGNATURE_EXTENSION_MISMATCH',
    };
  }

  return {
    valid: true,
    detectedType,
  };
}

