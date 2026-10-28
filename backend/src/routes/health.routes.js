import express from 'express';
import { getDBStatus } from '../config/db.js';
import { getFirebaseAdminStatus } from '../config/firebaseAdmin.js';

const router = express.Router();

/**
 * GET /api/health
 * Returns server, database, and auth status safely without exposing secrets.
 */
router.get('/', (req, res) => {
  const dbStatus = getDBStatus();
  const firebaseStatus = getFirebaseAdminStatus();

  const isHealthy = dbStatus.connected && firebaseStatus.configured;

  return res.status(200).json({
    success: true,
    status: isHealthy ? 'healthy' : 'degraded',
    service: 'neev-backend',
    environment: process.env.NODE_ENV || 'development',
    database: {
      connected: dbStatus.connected,
      status: dbStatus.status,
      configured: dbStatus.configured,
    },
    firebaseAdmin: {
      configured: firebaseStatus.configured,
      projectId: firebaseStatus.projectId || null,
    },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

export default router;
