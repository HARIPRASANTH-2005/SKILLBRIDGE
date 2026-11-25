

// new changes

// ─────────────────────────────────────────────
// config/db.js — MongoDB connection & health manager
// ─────────────────────────────────────────────

const mongoose = require('mongoose');

let connectionPromise = null;


// ─────────────────────────────────────────────
// DATABASE HEALTH CHECK
// ─────────────────────────────────────────────

const isDbConnected = () => {
  return mongoose.connection.readyState === 1;
};


// ─────────────────────────────────────────────
// DATABASE CONNECTION
// ─────────────────────────────────────────────

const connectDB = async () => {

  // Already connected
  if (isDbConnected()) {
    return true;
  }

  // Controlled offline mode
  if (!process.env.MONGO_URI) {
    console.warn(
      'MongoDB: MONGO_URI not configured. Running in controlled offline mode.'
    );
    return false;
  }

  // Prevent multiple simultaneous connection attempts
  if (connectionPromise) {
    return connectionPromise;
  }

  connectionPromise = (async () => {
    try {
      const conn = await mongoose.connect(
        process.env.MONGO_URI,
        {
          serverSelectionTimeoutMS: 5000,
          connectTimeoutMS: 5000,
          ...(process.env.DB_NAME
            ? { dbName: process.env.DB_NAME }
            : {})
        }
      );

      console.log(
        `MongoDB connected successfully. Database: ${conn.connection.name}`
      );

      return true;

    } catch (err) {
      console.error(
        'MongoDB connection failed:',
        err.message
      );

      return false;

    } finally {
      connectionPromise = null;
    }
  })();

  return connectionPromise;
};


// ─────────────────────────────────────────────
// CONNECTION EVENT LISTENERS
// ─────────────────────────────────────────────

mongoose.connection.on('connected', () => {
  console.log('MongoDB connection established.');
});

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB connection lost.');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
});


// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

connectDB.connectDB = connectDB;
connectDB.isDbConnected = isDbConnected;

module.exports = connectDB;
