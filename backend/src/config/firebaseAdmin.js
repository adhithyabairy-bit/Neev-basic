import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

let isConfigured = false;
let initError = null;

/**
 * Initializes Firebase Admin SDK using Application Default Credentials (ADC),
 * an explicit service account JSON key file path, or project ID configuration.
 */
function initFirebaseAdmin() {
  if (admin.apps.length > 0) {
    isConfigured = true;
    return admin.app();
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  try {
    // Strategy 1: Explicit Service Account JSON file path
    if (credentialsPath) {
      const resolvedPath = path.isAbsolute(credentialsPath)
        ? credentialsPath
        : path.resolve(process.cwd(), credentialsPath);

      if (fs.existsSync(resolvedPath)) {
        const fileContent = fs.readFileSync(resolvedPath, 'utf8');
        const serviceAccount = JSON.parse(fileContent);

        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id || projectId,
        });

        isConfigured = true;
        console.log(`[Firebase Admin] Initialized successfully using service account file: ${resolvedPath}`);
        return admin.app();
      } else {
        const msg = `GOOGLE_APPLICATION_CREDENTIALS path not found: ${resolvedPath}`;
        console.warn(`[Firebase Admin] Warning: ${msg}`);
        initError = msg;
      }
    }

    // Strategy 2: Initialize with project ID
    if (projectId) {
      try {
        admin.initializeApp({
          projectId: projectId,
        });

        isConfigured = true;
        console.log(`[Firebase Admin] Initialized successfully for project: ${projectId}`);
        return admin.app();
      } catch (projErr) {
        initError = projErr.message;
        console.warn(`[Firebase Admin] Could not initialize with project ID: ${projErr.message}`);
      }
    }

    // Notice: Credentials not provided yet
    initError = 'Neither GOOGLE_APPLICATION_CREDENTIALS nor FIREBASE_PROJECT_ID is defined in backend/.env.';
    console.warn(`[Firebase Admin] Notice: ${initError}`);
    console.warn('[Firebase Admin] Token verification will fail until valid Firebase Admin credentials are provided.');
  } catch (err) {
    initError = err.message;
    console.error(`[Firebase Admin] Initialization error: ${err.message}`);
  }

  return null;
}

// Perform initial setup
initFirebaseAdmin();

/**
 * Checks whether Firebase Admin SDK was initialized with valid credentials.
 * @returns {boolean}
 */
export function isFirebaseAdminConfigured() {
  return isConfigured && admin.apps.length > 0;
}

/**
 * Returns any initialization error or configuration notice.
 * @returns {string|null}
 */
export function getFirebaseAdminStatus() {
  if (isFirebaseAdminConfigured()) {
    return {
      configured: true,
      projectId: admin.app().options.projectId || process.env.FIREBASE_PROJECT_ID || 'Configured',
    };
  }
  return {
    configured: false,
    reason: initError || 'Uninitialized',
  };
}

export { admin };
export default admin;
