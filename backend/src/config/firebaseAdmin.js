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
 * Initializes Firebase Admin SDK with credentials from:
 * 1. FIREBASE_SERVICE_ACCOUNT (raw JSON string or base64 encoded)
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
    // Strategy 1: Raw JSON string or Base64 in FIREBASE_SERVICE_ACCOUNT / FIREBASE_SERVICE_ACCOUNT_KEY
    const serviceAccountJson =
      process.env.FIREBASE_SERVICE_ACCOUNT ||
      process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountJson && typeof serviceAccountJson === 'string') {
      try {
        let raw = serviceAccountJson.trim();
        if (!raw.startsWith('{')) {
          raw = Buffer.from(raw, 'base64').toString('utf8');
        }
        const parsed = JSON.parse(raw);
        if (parsed.private_key) {
          parsed.private_key = formatPrivateKey(parsed.private_key);
        }

        admin.initializeApp({
          credential: admin.credential.cert(parsed),
          projectId: parsed.project_id || projectId,
          storageBucket,
        });

        isConfigured = true;
        hasServiceAccount = true;
        console.log(`[Firebase Admin] Initialized successfully using FIREBASE_SERVICE_ACCOUNT JSON.`);
        return admin.app();
      } catch (jsonErr) {
        console.warn(`[Firebase Admin] Could not parse FIREBASE_SERVICE_ACCOUNT JSON: ${jsonErr.message}`);
        initError = `Invalid FIREBASE_SERVICE_ACCOUNT JSON: ${jsonErr.message}`;
      }
    }

    // Strategy 2: Individual env vars (FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY)
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const rawPrivateKey = process.env.FIREBASE_PRIVATE_KEY;

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
        console.log(`[Firebase Admin] Initialized successfully using FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY.`);
        return admin.app();
      } catch (credErr) {
        console.warn(`[Firebase Admin] Could not initialize with FIREBASE_CLIENT_EMAIL/PRIVATE_KEY: ${credErr.message}`);
        initError = `Invalid Firebase credentials: ${credErr.message}`;
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
          console.log(`[Firebase Admin] Initialized successfully using service account file: ${resolvedPath}`);
          return admin.app();
        } catch (fileErr) {
          console.warn(`[Firebase Admin] Could not read service account file: ${fileErr.message}`);
          initError = `Invalid service account file: ${fileErr.message}`;
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

/**
 * Checks whether Firebase Admin SDK is initialized.
 * @returns {boolean}
 */
export function isFirebaseAdminConfigured() {
  return isConfigured && admin.apps.length > 0;
}

let overrideHasServiceAccountForTest = null;

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
        : 'Service account credentials (FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY) not provided. Revocation check requires credentials.',
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
