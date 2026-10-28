import { admin, isFirebaseAdminConfigured } from '../config/firebaseAdmin.js';
import Teacher from '../models/Teacher.js';
import { getDBStatus } from '../config/db.js';

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
      error: 'Service Unavailable: Firebase Admin SDK is not configured. Please define GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID in backend/.env.',
      code: 'FIREBASE_NOT_CONFIGURED',
    });
  }

  // Check Database connection
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
      decodedToken = await admin.auth().verifyIdToken(idToken, true);
    } catch (verifyErr) {
      if (
        verifyErr.code === 'auth/id-token-expired' ||
        verifyErr.code === 'auth/id-token-revoked'
      ) {
        throw verifyErr;
      }
      decodedToken = await admin.auth().verifyIdToken(idToken, false);
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

    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid Firebase ID token.',
      code: 'INVALID_TOKEN',
    });
  }
}

export default authenticate;
