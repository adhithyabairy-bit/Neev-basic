import mongoose from 'mongoose';

let connectionStatus = 'disconnected';
let lastError = null;

/**
 * Connect to MongoDB Atlas via Mongoose using MONGODB_URI.
 * Does not crash the process if the connection fails or if MONGODB_URI is not set,
 * allowing the server to start, serve health status, and handle requests gracefully.
 */
export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    connectionStatus = 'unconfigured';
    lastError = 'MONGODB_URI is not defined in environment';
    console.warn('[MongoDB] Notice: MONGODB_URI is not set in backend/.env. Database features will be unavailable.');
    return null;
  }

  // If already connected, return existing connection
  if (mongoose.connection.readyState === 1) {
    connectionStatus = 'connected';
    return mongoose.connection;
  }

  try {
    connectionStatus = 'connecting';
    lastError = null;

    mongoose.connection.on('connected', () => {
      connectionStatus = 'connected';
      console.log('[MongoDB] Connected successfully to MongoDB Atlas.');
    });

    mongoose.connection.on('error', (err) => {
      connectionStatus = 'error';
      lastError = err.message;
      console.error('[MongoDB Error]:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      connectionStatus = 'disconnected';
      console.warn('[MongoDB] Disconnected from MongoDB Atlas.');
    });

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    connectionStatus = 'connected';
    return conn;
  } catch (err) {
    connectionStatus = 'error';
    lastError = err.message;
    console.error(`[MongoDB] Connection failed: ${err.message}`);
    return null;
  }
}

/**
 * Returns database connection diagnostics safely without exposing credentials.
 */
export function getDBStatus() {
  const stateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };

  const readyState = mongoose.connection.readyState;
  const isConnected = readyState === 1;

  return {
    connected: isConnected,
    status: stateMap[readyState] || connectionStatus,
    configured: Boolean(process.env.MONGODB_URI),
    error: isConnected ? null : lastError,
  };
}

/**
 * Disconnect from MongoDB gracefully (useful for tests and shutdowns).
 */
export async function disconnectDB() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionStatus = 'disconnected';
  }
}

export default connectDB;
