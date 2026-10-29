import app from './src/app.js';
import { connectDB } from './src/config/db.js';

/**
 * Vercel Express Entry Point
 * Automatically initiates connection to MongoDB Atlas asynchronously on serverless cold starts
 * and exports the Express app instance directly for Vercel.
 */
if (process.env.MONGODB_URI) {
  connectDB().catch((err) => {
    console.warn('[Vercel Express] MongoDB connection notice:', err.message);
  });
}

export default app;
