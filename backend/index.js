import app from './src/app.js';
import { connectDB } from './src/config/db.js';
import mongoose from 'mongoose';

/**
 * Vercel Express Entry Point
 * Automatically connects to MongoDB Atlas on serverless cold starts
 * and delegates requests to the Express app.
 */
let dbConnected = false;

const handler = async (req, res) => {
  if (!dbConnected && mongoose.connection.readyState !== 1 && process.env.MONGODB_URI) {
    try {
      await connectDB();
      dbConnected = true;
    } catch (err) {
      console.warn('[Vercel Express] MongoDB connection notice:', err.message);
    }
  }
  return app(req, res);
};

// Inherit Express app methods and properties
Object.setPrototypeOf(handler, app);

export default handler;


