import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check potential locations for .env
const envPaths = [
  path.resolve(__dirname, '../.env'),
  path.resolve(process.cwd(), 'backend/.env'),
  path.resolve(process.cwd(), '.env'),
];

for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    break;
  }
}

import app from './app.js';
import { isFirebaseAdminConfigured, getFirebaseAdminStatus } from './config/firebaseAdmin.js';

const PORT = parseInt(process.env.PORT, 10) || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

process.on('uncaughtException', (err) => {
  console.error('[Neev Backend Uncaught Exception]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[Neev Backend Unhandled Rejection]:', reason);
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log(`  Neev Express Backend running in [${NODE_ENV}] mode`);
  console.log(`  Listening on: http://localhost:${PORT} and http://127.0.0.1:${PORT}`);
  console.log(`  Health Check: http://localhost:${PORT}/api/health`);
  console.log(`  Allowed Origin: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
  
  const status = getFirebaseAdminStatus();
  if (status.configured) {
    console.log(`  Firebase Admin: ACTIVE (Project: ${status.projectId})`);
  } else {
    console.warn(`  Firebase Admin: WAITING FOR CREDENTIALS`);
    console.warn(`  Reason: ${status.reason}`);
    console.warn(`  Configure backend/.env with GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID`);
  }
  console.log('====================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n[Neev Backend Error] Port ${PORT} is already in use by another process.`);
    console.error(`Please stop the previous running backend process or run: npx kill-port ${PORT}\n`);
    process.exit(1);
  } else {
    console.error('[Neev Backend Error] Failed to start server:', err);
  }
});

// Graceful shutdown handlers
function handleShutdown(signal) {
  console.log(`\nReceived ${signal}. Shutting down Neev Express backend gracefully...`);
  server.close(() => {
    console.log('Server closed. Process terminating.');
    process.exit(0);
  });

  // Force close after 5 seconds if hanging
  setTimeout(() => {
    console.error('Force closing server after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

export default server;
