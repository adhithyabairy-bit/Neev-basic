import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let isConfigured = false;
let hasServiceAccount = false;
let initError = null;

/**
 * Normalizes a private key string from environment variables,
 * converting escaped newlines and stripping surrounding quotes.
 *
 * @param {string} rawKey
 * @returns {string|null}
 */
export function formatPrivateKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return null;
  let key = rawKey.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, '\n');
}

/**
 * Resiliently parses a service account JSON string across various formats:
 * - Direct JSON string
 * - Wrapped in outer quotes
 * - Escaped double quotes (\"type\": \"service_account\")
 * - Base64 encoded JSON
 * - Double-stringified JSON
 *
 * @param {string} val
 * @returns {Object|null}
 */
export function parseServiceAccount(val) {
  if (!val || typeof val !== 'string') return null;
  let str = val.trim();

  // Strip wrapping outer quotes if present
  if (
    (str.startsWith('"') && str.endsWith('"')) ||
    (str.startsWith("'") && str.endsWith("'"))
  ) {
    str = str.slice(1, -1).trim();
  }

  // 1. Direct JSON parse
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj === 'object') return obj;
  } catch {}

  // 2. Unescape escaped double quotes (e.g. {\"type\": \"service_account\"})
  if (str.includes('\\"')) {
    try {
      const unescaped = str.replace(/\\"/g, '"');
      const obj = JSON.parse(unescaped);
      if (obj && typeof obj === 'object') return obj;
    } catch {}
  }

  // 3. Base64 decode
  try {
    const decoded = Buffer.from(str, 'base64').toString('utf8');
    if (decoded.includes('"type"') || decoded.includes('service_account')) {
      const obj = JSON.parse(decoded);
      if (obj && typeof obj === 'object') return obj;
    }
  } catch {}

  // 4. Handle JSON-stringified string (e.g. "\"{\\\"type\\\":...}\"")
  try {
    const firstPass = JSON.parse(str);
    if (typeof firstPass === 'string') {
      const secondPass = JSON.parse(firstPass);
      if (secondPass && typeof secondPass === 'object') return secondPass;
    }
  } catch {}

  return null;
}

/**
 * Initializes Firebase Admin SDK with credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT (raw JSON, escaped JSON, or Base64)
 * 2. FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY (individual env vars)
 * 3. GOOGLE_APPLICATION_CREDENTIALS (file path)
 * 4. Application Default Credentials (ADC)
 * 5. Project ID fallback (token signature verification only; revocation requires service account)
 */
function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    isConfigured = true;
    return admin.app();
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'neev-f681e';

  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ||
    (projectId ? `${projectId}.firebasestorage.app` : null) ||
    (projectId ? `${projectId}.appspot.com` : null);

  try {
    // Strategy 1: FIREBASE_SERVICE_ACCOUNT (JSON or Base64 in any format)
    const serviceAccountRaw =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY ||
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
      process.env.GOOGLE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_CREDENTIALS;

    if (serviceAccountRaw) {
      const parsed = parseServiceAccount(serviceAccountRaw);
      if (parsed) {
        const clientEmail = parsed.client_email || parsed.clientEmail;
        let privateKey = parsed.private_key || parsed.privateKey;
        const saProjectId = parsed.project_id || parsed.projectId || projectId;

        if (clientEmail && privateKey) {
          privateKey = formatPrivateKey(privateKey);
          admin.initializeApp({
            credential: admin.credential.cert({
              projectId: saProjectId,
              clientEmail: clientEmail.trim(),
              privateKey: privateKey,
            }),
            projectId: saProjectId,
            storageBucket,
          });

          isConfigured = true;
          hasServiceAccount = true;
          initError = null;
          console.log(`[Firebase Admin] Initialized successfully using FIREBASE_SERVICE_ACCOUNT.`);
          return admin.app();
        } else {
          initError = 'FIREBASE_SERVICE_ACCOUNT JSON is missing client_email or private_key.';
          console.warn(`[Firebase Admin] ${initError}`);
        }
      } else {
        initError = 'FIREBASE_SERVICE_ACCOUNT is defined but could not be parsed as valid JSON or Base64.';
        console.warn(`[Firebase Admin] ${initError}`);
      }
    }

    // Strategy 2: Individual env vars (FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY)
    const clientEmail =
      process.env.FIREBASE_CLIENT_EMAIL ||
      process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const rawPrivateKey =
      process.env.FIREBASE_PRIVATE_KEY ||
      process.env.FIREBASE_ADMIN_PRIVATE_KEY;

    if (clientEmail && rawPrivateKey) {
      try {
        const formattedKey = formatPrivateKey(rawPrivateKey);
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail: clientEmail.trim(),
            privateKey: formattedKey,
          }),
          projectId,
          storageBucket,
        });

        isConfigured = true;
        hasServiceAccount = true;
        initError = null;
        console.log(`[Firebase Admin] Initialized successfully using FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.`);
        return admin.app();
      } catch (credErr) {
        initError = `Invalid Firebase credentials: ${credErr.message}`;
        console.warn(`[Firebase Admin] Could not initialize with FIREBASE_CLIENT_EMAIL/PRIVATE_KEY: ${credErr.message}`);
      }
    }

    // Strategy 3: GOOGLE_APPLICATION_CREDENTIALS file path
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    if (credentialsPath) {
      const resolvedPath = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.resolve(process.cwd(), credentialsPath);

      if (fs.existsSync(resolvedPath)) {
        try {
          const fileContent = fs.readFileSync(resolvedPath, 'utf8');
          const serviceAccount = JSON.parse(fileContent);
          if (serviceAccount.private_key) {
            serviceAccount.private_key = formatPrivateKey(serviceAccount.private_key);
          }

          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: serviceAccount.project_id || projectId,
            storageBucket,
          });

          isConfigured = true;
          hasServiceAccount = true;
          initError = null;
          console.log(`[Firebase Admin] Initialized successfully using service account file: ${resolvedPath}`);
          return admin.app();
        } catch (fileErr) {
          initError = `Invalid service account file: ${fileErr.message}`;
          console.warn(`[Firebase Admin] Could not read service account file: ${fileErr.message}`);
        }
      } else {
        const msg = `GOOGLE_APPLICATION_CREDENTIALS path not found: ${resolvedPath}`;
        console.warn(`[Firebase Admin] Notice: ${msg}`);
      }
    }

    // Strategy 4: Fallback initialize with Project ID only
    if (projectId) {
      try {
        admin.initializeApp({
          projectId,
          storageBucket,
        });

        isConfigured = true;
        hasServiceAccount = false;
        console.log(`[Firebase Admin] Initialized with Project ID only (${projectId}). Token revocation checks require FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.`);
        return admin.app();
      } catch (projErr) {
        initError = projErr.message;
        console.warn(`[Firebase Admin] Could not initialize with project ID: ${projErr.message}`);
      }
    }

    initError = 'Neither service account credentials nor FIREBASE_PROJECT_ID are configured.';
    console.warn(`[Firebase Admin] Notice: ${initError}`);
  } catch (err) {
    initError = err.message;
    console.error(`[Firebase Admin] Initialization exception: ${err.message}`);
  }

  return null;
}

// Perform initial setup
initFirebaseAdmin();

let overrideHasServiceAccountForTest = null;

/**
 * Checks whether Firebase Admin SDK is initialized.
 * @returns {boolean}
 */
export function isFirebaseAdminConfigured() {
  return isConfigured && admin.apps.length > 0;
}

/**
 * Checks whether Firebase Admin SDK was initialized with full service account credentials
 * (required to query the Auth backend for token revocation status).
 * @returns {boolean}
 */
export function hasServiceAccountCredentials() {
  if (overrideHasServiceAccountForTest !== null) {
    return overrideHasServiceAccountForTest;
  }
  return hasServiceAccount;
}

/**
 * Overrides service account credential status strictly for test suites.
 * @param {boolean|null} val
 */
export function setHasServiceAccountForTest(val) {
  overrideHasServiceAccountForTest = val;
}

/**
 * Returns diagnostic status of Firebase Admin configuration.
 * @returns {Object}
 */
export function getFirebaseAdminStatus() {
  if (isFirebaseAdminConfigured()) {
    return {
      configured: true,
      hasServiceAccount: hasServiceAccountCredentials(),
      projectId: admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID || 'Configured',
      reason: hasServiceAccount
        ? null
        : (initError || 'Service account credentials (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT) not provided. Revocation check requires credentials.'),
    };
  }
  return {
    configured: false,
    hasServiceAccount: false,
    reason: initError || 'Uninitialized',
  };
}

export { admin };
export default admin;
