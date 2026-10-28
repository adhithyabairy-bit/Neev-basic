/**
 * Neev Platform - Firebase Authentication & Backend Session Service
 * Integrates client Firebase Authentication with the Express backend.
 *
 * Flow:
 * 1. Frontend authenticates with Firebase Authentication (email/password).
 * 2. On success, retrieves the cryptographically signed Firebase ID token.
 * 3. Sends ID token to Express backend POST /api/auth/session in an Authorization header.
 * 4. Express backend verifies token with Firebase Admin SDK.
 * 5. Access to Teacher Dashboard is granted ONLY if backend token verification succeeds.
 */

const STORAGE_KEY = 'neev_authenticated_teacher';

/**
 * Public Firebase client configuration from Vite environment variables.
 */
export const FIREBASE_CONFIG = {
  apiKey: (import.meta.env.VITE_FIREBASE_API_KEY || '').trim(),
  authDomain: (import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '').trim(),
  projectId: (import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim(),
  storageBucket: (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '').trim(),
  messagingSenderId: (import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '').trim(),
  appId: (import.meta.env.VITE_FIREBASE_APP_ID || '').trim(),
  measurementId: (import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '').trim(),
};

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

/**
 * Checks whether the necessary Firebase environment variables are defined.
 */
export function isFirebaseConfigured() {
  return Boolean(
    FIREBASE_CONFIG.apiKey &&
    FIREBASE_CONFIG.authDomain &&
    FIREBASE_CONFIG.projectId &&
    FIREBASE_CONFIG.appId
  );
}

/**
 * Returns a list of missing configuration variables for user diagnostics.
 */
export function getMissingFirebaseConfig() {
  const missing = [];
  if (!FIREBASE_CONFIG.apiKey) missing.push('VITE_FIREBASE_API_KEY');
  if (!FIREBASE_CONFIG.authDomain) missing.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!FIREBASE_CONFIG.projectId) missing.push('VITE_FIREBASE_PROJECT_ID');
  if (!FIREBASE_CONFIG.appId) missing.push('VITE_FIREBASE_APP_ID');
  return missing;
}

/**
 * Translates Firebase Identity Toolkit error codes to user-friendly messages.
 */
function mapFirebaseError(rawError) {
  const message = typeof rawError === 'string' ? rawError : rawError?.message || '';

  if (message.includes('EMAIL_NOT_FOUND')) {
    return 'No teacher account found with this email address. Please register first.';
  }
  if (message.includes('INVALID_PASSWORD') || message.includes('INVALID_LOGIN_CREDENTIALS')) {
    return 'Incorrect email or password. Please verify your credentials.';
  }
  if (message.includes('EMAIL_EXISTS')) {
    return 'An account with this email address already exists. Please sign in instead.';
  }
  if (message.includes('WEAK_PASSWORD')) {
    return 'Password is too weak. Please choose a password with at least 6 characters.';
  }
  if (message.includes('USER_DISABLED')) {
    return 'This teacher account has been suspended or disabled by the administrator.';
  }
  if (message.includes('TOO_MANY_ATTEMPTS_TRY_LATER')) {
    return 'Access temporarily blocked due to repeated failed login attempts. Please try again later.';
  }
  if (message.includes('INVALID_EMAIL')) {
    return 'The provided email address is invalid.';
  }
  if (message.includes('NETWORK_ERROR') || message.includes('Failed to fetch')) {
    return 'Network connection error. Please verify your internet connectivity.';
  }
  return message || 'An unexpected authentication error occurred. Please try again.';
}

/**
 * Verifies the Firebase ID token with the Express backend.
 * Never grants access if backend verification fails.
 */
async function verifyTokenWithBackend(idToken) {
  const tryUrls = [
    `${API_BASE_URL}/api/auth/session`,
    ...(API_BASE_URL.includes('localhost')
      ? [`${API_BASE_URL.replace('localhost', '127.0.0.1')}/api/auth/session`]
      : []),
  ];

  let networkError = false;
  for (const url of tryUrls) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `Backend verification failed (HTTP ${response.status})`,
          code: data.code || 'BACKEND_VERIFICATION_FAILED',
        };
      }

      return {
        success: true,
        teacher: data.teacher,
      };
    } catch (err) {
      networkError = true;
    }
  }

  return {
    success: false,
    error: `Cannot reach Express backend at ${API_BASE_URL}. Ensure the backend is running in your terminal (run: npm run dev:backend).`,
    code: 'BACKEND_UNAVAILABLE',
  };
}

/**
 * Authenticates an existing teacher with email and password via Firebase,
 * then confirms identity with the Express backend.
 */
export async function loginWithEmail(email, password, rememberMe = true) {
  if (!isFirebaseConfigured()) {
    const missing = getMissingFirebaseConfig().join(', ');
    return {
      success: false,
      error: `Firebase is not configured. Missing required variables: ${missing}. Please set them in your frontend .env file.`,
      code: 'CONFIG_MISSING',
    };
  }

  try {
    // Step 1: Firebase Auth client authentication
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data?.error?.message || 'Authentication failed';
      return {
        success: false,
        error: mapFirebaseError(errorMessage),
        code: data?.error?.message,
      };
    }

    // Step 2: Cryptographic token verification with Express backend
    const backendResult = await verifyTokenWithBackend(data.idToken);

    if (!backendResult.success) {
      return {
        success: false,
        error: backendResult.error,
        code: backendResult.code,
      };
    }

    // Step 3: Verified teacher identity established
    const verifiedTeacher = backendResult.teacher;

    const teacher = {
      uid: verifiedTeacher.uid,
      email: verifiedTeacher.email,
      emailVerified: verifiedTeacher.emailVerified,
      displayName: verifiedTeacher.displayName || data.displayName || email.split('@')[0],
      idToken: data.idToken,
      refreshToken: data.refreshToken,
      expiresIn: data.expiresIn,
      authenticatedAt: new Date().toISOString(),
      backendVerified: true,
    };

    saveSession(teacher, rememberMe);
    notifyAuthSubscribers(teacher);

    return {
      success: true,
      user: teacher,
    };
  } catch (err) {
    return {
      success: false,
      error: mapFirebaseError(err),
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Registers a new teacher account with name, email, and password via Firebase,
 * and requests email verification.
 */
export async function registerWithEmail(name, email, password) {
  if (!isFirebaseConfigured()) {
    const missing = getMissingFirebaseConfig().join(', ');
    return {
      success: false,
      error: `Firebase is not configured. Missing required variables: ${missing}. Please set them in your frontend .env file.`,
      code: 'CONFIG_MISSING',
    };
  }

  try {
    const signUpUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_CONFIG.apiKey}`;
    const signUpRes = await fetch(signUpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.trim(),
        password,
        returnSecureToken: true,
      }),
    });

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok) {
      const errorMessage = signUpData?.error?.message || 'Registration failed';
      return {
        success: false,
        error: mapFirebaseError(errorMessage),
        code: signUpData?.error?.message,
      };
    }

    // Set displayName via update profile
    const updateUrl = `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${FIREBASE_CONFIG.apiKey}`;
    await fetch(updateUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        idToken: signUpData.idToken,
        displayName: name.trim(),
        returnSecureToken: true,
      }),
    });

    // Send email verification message through Firebase
    try {
      const verifyEmailUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_CONFIG.apiKey}`;
      await fetch(verifyEmailUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestType: 'VERIFY_EMAIL',
          idToken: signUpData.idToken,
        }),
      });
    } catch (e) {
      console.warn('Email verification send notice:', e);
    }

    // Verify token with backend
    const backendResult = await verifyTokenWithBackend(signUpData.idToken);

    if (!backendResult.success) {
      return {
        success: false,
        error: backendResult.error,
        code: backendResult.code,
      };
    }

    const verifiedTeacher = backendResult.teacher;

    const teacher = {
      uid: verifiedTeacher.uid,
      email: verifiedTeacher.email,
      emailVerified: verifiedTeacher.emailVerified,
      displayName: name.trim() || signUpData.email.split('@')[0],
      idToken: signUpData.idToken,
      refreshToken: signUpData.refreshToken,
      expiresIn: signUpData.expiresIn,
      authenticatedAt: new Date().toISOString(),
      backendVerified: true,
    };

    saveSession(teacher, true);
    notifyAuthSubscribers(teacher);

    return {
      success: true,
      user: teacher,
    };
  } catch (err) {
    return {
      success: false,
      error: mapFirebaseError(err),
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Sends a password reset email via Firebase.
 */
export async function sendPasswordReset(email) {
  if (!isFirebaseConfigured()) {
    const missing = getMissingFirebaseConfig().join(', ');
    return {
      success: false,
      error: `Firebase is not configured. Missing required variables: ${missing}. Please set them in your frontend .env file.`,
      code: 'CONFIG_MISSING',
    };
  }

  try {
    const resetUrl = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${FIREBASE_CONFIG.apiKey}`;
    const res = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        requestType: 'PASSWORD_RESET',
        email: email.trim(),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const errorMessage = data?.error?.message || 'Password reset request failed';
      return {
        success: false,
        error: mapFirebaseError(errorMessage),
        code: data?.error?.message,
      };
    }

    return {
      success: true,
      message: 'Password reset link sent successfully. Please check your inbox.',
    };
  } catch (err) {
    return {
      success: false,
      error: mapFirebaseError(err),
      code: 'NETWORK_ERROR',
    };
  }
}

/**
 * Re-validates the stored session with Express backend /api/auth/me.
 */
export async function checkBackendSession() {
  const session = getCurrentTeacherSession();
  if (!session || !session.idToken) return { valid: false };

  try {
    const res = await fetch(`${API_BASE_URL}/api/auth/me`, {
      headers: {
        Authorization: `Bearer ${session.idToken}`,
      },
    });

    if (!res.ok) {
      return { valid: false, status: res.status };
    }

    const data = await res.json();
    return { valid: true, teacher: data.teacher };
  } catch (e) {
    return { valid: false, offline: true };
  }
}

/**
 * Logs out the active teacher and clears session storage.
 */
export function logout() {
  localStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  notifyAuthSubscribers(null);
}

/**
 * Retrieves the currently persisted teacher session, if valid.
 */
export function getCurrentTeacherSession() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Silently refreshes the Firebase ID token using the persisted refresh token.
 */
export async function refreshIdToken() {
  const session = getCurrentTeacherSession();
  if (!session?.refreshToken || !FIREBASE_CONFIG.apiKey) {
    return null;
  }

  try {
    const url = `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: session.refreshToken,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const updatedSession = {
      ...session,
      idToken: data.id_token,
      refreshToken: data.refresh_token,
    };

    saveSession(updatedSession, true);
    notifyAuthSubscribers(updatedSession);
    return data.id_token;
  } catch (err) {
    return null;
  }
}

function saveSession(teacher, rememberMe) {
  const json = JSON.stringify(teacher);
  if (rememberMe) {
    localStorage.setItem(STORAGE_KEY, json);
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, json);
    localStorage.removeItem(STORAGE_KEY);
  }
}

// Authentication state subscriber listeners
const subscribers = new Set();

export function subscribeToAuth(callback) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function notifyAuthSubscribers(user) {
  subscribers.forEach((cb) => {
    try {
      cb(user);
    } catch (e) {
      console.error('Auth subscriber error:', e);
    }
  });
}
