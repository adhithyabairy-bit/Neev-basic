import mongoose from 'mongoose';
import {
  admin,
  isFirebaseAdminConfigured,
  hasServiceAccountCredentials,
} from '../config/firebaseAdmin.js';
import Teacher from '../models/Teacher.js';
import { getDBStatus, connectDB } from '../config/db.js';

/**
 * Express middleware to authenticate teachers via Firebase ID Token
 * and bind the verified identity to a MongoDB Teacher profile.
 *
 * Requirements:
 * 1. Checks Authorization: Bearer <token> header.
 * 2. Cryptographically verifies token via Firebase Admin SDK.
 * 3. Never trusts teacherId from request body or query.
 * 4. Safely retrieves or creates the Teacher record in MongoDB by firebaseUid.
 * 5. Attaches req.teacher (Mongoose doc) and req.user (token claims) to request.
 */
export async function authenticate(req, res, next) {
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
      error: 'Unauthorized: Empty Firebase ID token provided.',
      code: 'TOKEN_EMPTY',
    });
  }

  // Check Firebase Admin configuration
  if (!isFirebaseAdminConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Firebase Admin SDK is not initialized. Please check server configuration.',
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

  // Check Database connection - connect on-demand if disconnected or on cold start
  if (mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
    try {
      await connectDB();
    } catch (connErr) {
      console.warn('[Authenticate] Database connection attempt notice:', connErr.message);
    }
  }

  const dbStatus = getDBStatus();
  if (!dbStatus.connected) {
    return res.status(503).json({
      success: false,
      error: 'Service Unavailable: Database connection is not available. Please verify MONGODB_URI in backend/.env.',
      code: 'DATABASE_UNAVAILABLE',
    });
  }

  try {
    let decodedToken;
    try {
      // Cryptographically verify token and strictly check revocation status
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (err) {
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
        console.error('[Authenticate Middleware] Service account credential error:', {
          code: err.code || 'CREDENTIAL_ERROR',
          message: err.message,
        });

        return res.status(503).json({
          success: false,
          error: 'Service Unavailable: Firebase service account credentials could not be validated on the server.',
          code: 'FIREBASE_CREDENTIALS_INVALID',
        });
      }

      // Infrastructure / network / service failure -> Fail safely without revocation bypass
      console.error('[Authenticate Middleware] Infrastructure error while verifying token:', {
        code: err.code || 'UNKNOWN_ERROR',
        message: err.message,
      });

      return res.status(503).json({
        success: false,
        error: 'Service Unavailable: Unable to verify token revocation status due to an authentication infrastructure error. Please try again later.',
        code: 'REVOCATION_CHECK_UNAVAILABLE',
      });
    }

    const { uid, email, name } = decodedToken;

    if (!uid) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Invalid token claims, missing UID.',
        code: 'INVALID_CLAIMS',
      });
    }

    // Safely retrieve or upsert Teacher record in MongoDB
    let teacher = await Teacher.findOne({ firebaseUid: uid });

    if (!teacher) {
      teacher = await Teacher.create({
        firebaseUid: uid,
        email: email || '',
        name: name || (email ? email.split('@')[0] : 'Teacher'),
      });
    }

    // Attach verified teacher document and claims to request
    req.teacher = teacher;
    req.user = {
      uid,
      email: email || null,
      displayName: teacher.name,
      teacherId: teacher._id,
    };

    return next();
  } catch (err) {
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
        error: 'Unauthorized: Firebase ID token has been revoked.',
        code: 'TOKEN_REVOKED',
      });
    }

    if (err.code === 'auth/user-disabled') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Firebase user account has been disabled.',
        code: 'USER_DISABLED',
      });
    }

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Firebase ID token.',
      code: 'INVALID_TOKEN',
    });
  }
}

export default authenticate;
