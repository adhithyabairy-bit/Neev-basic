import { admin, isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';

/**
 * Express middleware to verify Firebase ID tokens passed in the Authorization header.
 *
 * Expected header:
 *   Authorization: Bearer <Firebase-ID-token>
 */
export async function verifyFirebaseToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header. Expected format: Bearer <Firebase-ID-token>',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Firebase ID token is empty',
    });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Firebase Admin SDK is not configured on the server. Please define GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID in backend/.env.',
    });
  }

  try {
    // Verify the ID token using Firebase Admin SDK
    // Attempt with checkRevoked: true first (if service account is configured)
    // Fall back to standard cryptographic verification if revocation check requires admin privileges
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (verifyErr) {
      if (
        verifyErr.code === 'auth/id-token-expired' ||
        verifyErr.code === 'auth/id-token-revoked'
      ) {
        throw verifyErr;
      }
      // If checkRevoked fails due to lack of service account / quota project, verify signature directly
      decodedToken = await admin.auth().verifyIdToken(idToken, false);
    }

    // Attach verified identity strictly from the cryptographically verified token
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || null,
      emailVerified: Boolean(decodedToken.email_verified),
      displayName: decodedToken.name || (decodedToken.email ? decodedToken.email.split('@')[0] : 'Teacher'),
      authTime: decodedToken.auth_time,
    };

    return next();
  } catch (err) {
    // Discriminate between token expiration, revocation, or invalid signature
    if (err.code === 'auth/id-token-expired') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Firebase ID token has expired. Please refresh your session.',
        code: 'TOKEN_EXPIRED',
      });
    }

    if (err.code === 'auth/id-token-revoked') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Firebase ID token has been revoked. Please sign in again.',
        code: 'TOKEN_REVOKED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Firebase ID token.',
      code: 'INVALID_TOKEN',
    });
  }
}

export default verifyFirebaseToken;
