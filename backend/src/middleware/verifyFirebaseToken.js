import {
  admin,
  isFirebaseAdminConfigured,
  hasServiceAccountCredentials,
} from '../config/firebaseAdmin.js';

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
      code: 'AUTH_HEADER_MISSING',
    });
  }

  const idToken = authHeader.split('Bearer ')[1]?.trim();

  if (!idToken) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Firebase ID token is empty',
      code: 'TOKEN_EMPTY',
    });
  }

  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Firebase Admin SDK is not initialized on the server. Please check server configuration.',
      code: 'FIREBASE_NOT_CONFIGURED',
    });
  }

  // Diagnostic check: Token revocation check requires service account credentials
  if (!hasServiceAccountCredentials()) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Firebase Admin is running without service account credentials (FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY, or FIREBASE_SERVICE_ACCOUNT). Token revocation status cannot be verified without service account credentials.',
      code: 'FIREBASE_CREDENTIALS_MISSING',
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

      // Check if the error is due to missing or invalid credentials
      const lowerMessage = (err.message || '').toLowerCase();
      if (
        lowerMessage.includes('credential') ||
        lowerMessage.includes('private key') ||
        lowerMessage.includes('pem') ||
        lowerMessage.includes('default credentials')
      ) {
        console.error('[Firebase Token Verification] Service account credential error:', {
          code: err.code || 'CREDENTIAL_ERROR',
          message: err.message,
        });

        return res.status(503).json({
          success: false,
          error: 'Service Unavailable: Firebase service account credentials could not be validated on the server.',
          code: 'FIREBASE_CREDENTIALS_INVALID',
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
