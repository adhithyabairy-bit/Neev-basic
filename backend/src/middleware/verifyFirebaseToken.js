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
    // Strictly verify token cryptographically AND check revocation status.
    // Never bypass revocation checks if infrastructure issues arise.
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (err) {
      // 1. Client auth / token validation errors -> 401
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

      if (err.code === 'auth/user-disabled') {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: User account has been disabled.',
          code: 'USER_DISABLED',
        });
      }

      if (
        err.code === 'auth/invalid-id-token' ||
        err.code === 'auth/argument-error' ||
        err.code === 'auth/invalid-argument' ||
        (err.name === 'FirebaseAuthError' && err.message?.toLowerCase().includes('token'))
      ) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid Firebase ID token.',
          code: 'INVALID_TOKEN',
        });
      }

      // 2. Infrastructure / network / service outage errors -> 503 (Fail safely!)
      console.error('[Firebase Token Verification] Infrastructure error while verifying token:', {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      });

      return res.status(503).json({
        success: false,
        error: 'Service Unavailable: Unable to verify token revocation status due to an authentication infrastructure error. Please try again later.',
        code: 'REVOCATION_CHECK_UNAVAILABLE',
      });
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
  } catch (outerErr) {
    console.error('[Firebase Token Verification] Unexpected error:', outerErr.message);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error during identity verification.',
      code: 'AUTH_INTERNAL_ERROR',
    });
  }
}

export default verifyFirebaseToken;
