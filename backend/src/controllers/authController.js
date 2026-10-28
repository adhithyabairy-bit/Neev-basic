import { getFirebaseAdminStatus } from '../config/firebaseAdmin.js';

/**
 * Controller handling Firebase authentication verification for teachers.
 */

/**
 * POST /api/auth/session
 * Verifies a Firebase ID token passed in the Authorization header and confirms access.
 */
export async function createSession(req, res) {
  // req.user has been attached by verifyFirebaseToken middleware
  const { uid, email, emailVerified, displayName } = req.user;

  return res.status(200).json({
    success: true,
    message: 'Firebase session successfully verified by Express backend',
    teacher: {
      uid,
      email,
      emailVerified,
      displayName,
    },
  });
}

/**
 * GET /api/auth/me
 * Returns the currently authenticated teacher identity verified from the ID token.
 */
export async function getCurrentUser(req, res) {
  const { uid, email, emailVerified, displayName } = req.user;

  return res.status(200).json({
    success: true,
    teacher: {
      uid,
      email,
      emailVerified,
      displayName,
    },
  });
}

/**
 * GET /api/health
 * Returns service status and Firebase Admin configuration diagnostics.
 */
export async function getHealth(req, res) {
  const adminStatus = getFirebaseAdminStatus();

  return res.status(200).json({
    status: 'ok',
    service: 'neev-backend',
    firebaseAdmin: adminStatus,
    timestamp: new Date().toISOString(),
  });
}
