import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import mongoose from 'mongoose';

/**
 * Vercel Express Entry Point
 * Automatically connects to MongoDB Atlas on serverless cold starts
 * and exports the Express app instance directly for Vercel.
 */
let dbConnected = false;

app.use(async (req, res, next) => {
  if (!dbConnected && mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (err) {
      console.warn('[Vercel Express] MongoDB connection notice:', err.message);
    }
  }
  next();
});

export default app;


