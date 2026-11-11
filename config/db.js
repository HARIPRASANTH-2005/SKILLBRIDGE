// ─────────────────────────────────────────────
//  config/db.js  —  MongoDB connection & health manager
// ─────────────────────────────────────────────
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn('⚠️  MONGO_URI not configured in .env. Running in controlled offline mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 2500, // Fail fast if MongoDB is down
      connectTimeoutMS: 3000,
      ...(process.env.DB_NAME ? { dbName: process.env.DB_NAME } : {})
    });
    isConnected = true;
    const activeDb = conn.connection.name || 'default';
    console.log(`✅  MongoDB connected: ${conn.connection.host} (database: "${activeDb}")`);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn('⚠️   MongoDB not connected:', err.message);
    return false;
  }
};

mongoose.connection.on('connected', () => { isConnected = true; });
mongoose.connection.on('disconnected', () => { isConnected = false; });
mongoose.connection.on('error', () => { isConnected = false; });

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};

connectDB.connectDB = connectDB;
connectDB.isDbConnected = isDbConnected;

module.exports = connectDB;
