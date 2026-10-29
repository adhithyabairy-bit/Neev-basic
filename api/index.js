import app from '../backend/src/app.js';
import connectDB from '../backend/src/config/db.js';

/**
 * Vercel Serverless Function Handler for Neev Express API
 * Automatically connects to MongoDB Atlas using connection pooling
 * and delegates HTTP requests to the Express application.
 */
export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('[Serverless Handler] Database connection error:', err.message);
    // Proceed so health check endpoints can respond with diagnostic details
  }

  return app(req, res);
}

