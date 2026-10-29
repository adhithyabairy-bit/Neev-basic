import dns from 'dns';
import mongoose from 'mongoose';

// Configure reliable DNS servers to avoid queryTxt ESERVFAIL on Windows and ISP resolvers
try {
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch {
  // Safe fallback to system defaults
}

let connectionStatus = 'disconnected';
let lastError = null;
let cachedPromise = null;

/**
 * Connect to MongoDB Atlas via Mongoose using MONGODB_URI.
 * Supports connection caching across warm serverless function invocations (Vercel).
 * Does not crash the process if connection fails, allowing health checks to run.
 */
export async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    connectionStatus = 'unconfigured';
    lastError = 'MONGODB_URI is not defined in environment';
    console.warn('[MongoDB] Notice: MONGODB_URI is not set. Database features will be unavailable.');
    return null;
  }

  // If already connected, return existing connection immediately
  if (mongoose.connection.readyState === 1) {
    connectionStatus = 'connected';
    return mongoose.connection;
  }

  // If a connection attempt is already in flight, reuse the cached promise
  if (cachedPromise && mongoose.connection.readyState === 2) {
    return cachedPromise;
  }

  connectionStatus = 'connecting';
  lastError = null;

  cachedPromise = (async () => {
    try {
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
        cachedPromise = null;
        console.warn('[MongoDB] Disconnected from MongoDB Atlas.');
      });

      const conn = await mongoose.connect(uri, {
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
      });

      connectionStatus = 'connected';
      return conn;
    } catch (err) {
      connectionStatus = 'error';
      lastError = err.message;
      cachedPromise = null;
      console.error(`[MongoDB] Connection failed: ${err.message}`);
      return null;
    }
  })();

  return cachedPromise;
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
  cachedPromise = null;
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    connectionStatus = 'disconnected';
  }
}

export default connectDB;
