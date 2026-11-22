// // ─────────────────────────────────────────────
// //  app.js  —  Express application entry point
// // ─────────────────────────────────────────────
// require('dotenv').config();          // Load .env FIRST
// const express    = require('express');
// const path       = require('path');
// const session    = require('express-session');
// const { MongoStore } = require('connect-mongo');
// const mongoose   = require('mongoose');
// const helmet     = require('helmet');
// const connectDB  = require('./config/db');

// // ── Route files ────────────────────────────────────
// const indexRoutes   = require('./routes/index');
// const studentRoutes = require('./routes/student');
// const alumniRoutes  = require('./routes/alumni');
// const projectRoutes = require('./routes/projects');
// const adminRoutes   = require('./routes/admin');
// const messageRoutes = require('./routes/messages');
// const reviewRoutes  = require('./routes/reviews');
// const authRoutes    = require('./routes/auth');

// const app = express();

// // ── Security Headers ────────────────────────────────
// app.use(helmet({
//   contentSecurityPolicy: false // Allows inline scripts & fonts during development
// }));

// // ── Connect to MongoDB ──────────────────────────────
// connectDB();

// // ── View engine (EJS) ──────────────────────────────
// app.set('view engine', 'ejs');
// app.set('views', path.join(__dirname, 'views'));

// // ── Body parsers ───────────────────────────────────
// app.use(express.urlencoded({ extended: true }));
// app.use(express.json());

// // ── Static files ───────────────────────────────────
// app.use(express.static(path.join(__dirname, 'public')));

// // ── Trust Proxy (Required for secure HTTPS cookies behind reverse proxies on Render) ──
// app.set('trust proxy', 1);

// // ── Session store (MongoDB-backed via connect-mongo) ──
// let sessionStore;
// if (process.env.MONGO_URI) {
//   sessionStore = MongoStore.create({
//     clientPromise: mongoose.connection.asPromise().then(conn => {
//       const client = conn.getClient();
//       if (!client) throw new Error('MongoDB client connection unavailable');
//       return client;
//     }),
//     collectionName: 'sessions',
//     ttl: 24 * 60 * 60,                     // 24 hours in seconds
//     autoRemove: 'native',
//     touchAfter: 24 * 3600                  // Lazy session update
//   });

//   // Handle store errors and offline mode safely
//   sessionStore.collectionP?.catch(err => {
//     console.warn('⚠️  Session store offline notice:', err.message);
//   });

//   sessionStore.on('error', err => {
//     console.warn('⚠️  Session store error:', err.message);
//   });
// }

// // ── Session middleware ─────────────────────────────
// app.use(session({
//   store: sessionStore,
//   name: 'skillbridge.sid',
//   secret: process.env.SESSION_SECRET || 'skillbridge-graphite-secret-2025',
//   resave: false,
//   saveUninitialized: false,
//   cookie: {
//     httpOnly: true,
//     sameSite: 'lax',
//     secure: process.env.NODE_ENV === 'production',
//     maxAge: 1000 * 60 * 60 * 24            // 24 hours
//   }
// }));

// // ── Global template variable ───────────────────────
// app.use((req, res, next) => {
//   res.locals.currentUser = req.session.user || null;
//   next();
// });

// // ── Mount routes ───────────────────────────────────
// app.use('/',          indexRoutes);     // GET /
// app.use('/student',   studentRoutes);   // /student/*
// app.use('/alumni',    alumniRoutes);    // /alumni/*
// app.use('/projects',  projectRoutes);   // /projects/*
// app.use('/admin',     adminRoutes);     // /admin/*
// app.use('/messages',  messageRoutes);   // /messages/*
// app.use('/reviews',   reviewRoutes);    // /reviews/*
// app.use('/',          authRoutes);      // /login, /logout, /status, /forgot-password

// // ── 404 handler ────────────────────────────────────
// app.use((req, res) => {
//   res.status(404).render('404', { title: 'Page Not Found — SkillBridge' });
// });

// // ── Global error handler ───────────────────────────
// app.use((err, req, res, next) => {
//   if (res.headersSent) {
//     return next(err);
//   }
//   console.error(err.stack);
//   res.status(500).render('500', { title: 'Server Error — SkillBridge', error: err.message });
// });

// // ── Start server ───────────────────────────────────
// // ── Start server ───────────────────────────────────
// const PORT = process.env.PORT || 3000;

// if (require.main === module) {
//   app.listen(PORT, '0.0.0.0', () => {
//     console.log(`🚀 SkillBridge running on port ${PORT}`);
//   });
// }

// module.exports = app;












// new changes

require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose = require('mongoose');
const helmet = require('helmet');

const connectDB = require('./config/db');

// ─────────────────────────────────────────────
// Route files
// ─────────────────────────────────────────────

const indexRoutes = require('./routes/index');
const studentRoutes = require('./routes/student');
const alumniRoutes = require('./routes/alumni');
const projectRoutes = require('./routes/projects');
const adminRoutes = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const reviewRoutes = require('./routes/reviews');
const authRoutes = require('./routes/auth');

const app = express();

// ─────────────────────────────────────────────
// Environment validation
// ─────────────────────────────────────────────

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

const PORT = Number(process.env.PORT) || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET;
const MONGO_URI = process.env.MONGO_URI;

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
  throw new Error(
    'SESSION_SECRET must be configured and contain at least 32 characters.'
  );
}

if (IS_PRODUCTION && !MONGO_URI) {
  throw new Error(
    'MONGO_URI is required in production.'
  );
}

// ─────────────────────────────────────────────
// Security headers
// ─────────────────────────────────────────────

app.disable('x-powered-by');

app.use(helmet({
  // Temporary compatibility setting for existing EJS inline scripts.
  // A restrictive Content Security Policy should be introduced
  // after the existing templates are reviewed.
  contentSecurityPolicy: false
}));

// ─────────────────────────────────────────────
// Trust proxy
// Required for secure cookies behind HTTPS reverse proxies.
// ─────────────────────────────────────────────

if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

// ─────────────────────────────────────────────
// View engine
// ─────────────────────────────────────────────

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ─────────────────────────────────────────────
// Request body parsers
// ─────────────────────────────────────────────

app.use(express.urlencoded({
  extended: true,
  limit: '100kb'
}));

app.use(express.json({
  limit: '100kb'
}));

// ─────────────────────────────────────────────
// Static files
// Only public assets are exposed.
// Private uploads remain outside this directory.
// ─────────────────────────────────────────────

app.use(express.static(
  path.join(__dirname, 'public'),
  {
    index: false,
    maxAge: IS_PRODUCTION ? '1d' : 0
  }
));

// ─────────────────────────────────────────────
// MongoDB session store
// ─────────────────────────────────────────────

let sessionStore;

if (MONGO_URI) {
  sessionStore = MongoStore.create({
    clientPromise: mongoose.connection
      .asPromise()
      .then(connection => connection.getClient()),

    collectionName: 'sessions',
    ttl: 24 * 60 * 60,
    autoRemove: 'native',
    touchAfter: 60 * 60
  });

  sessionStore.on('error', error => {
    console.error('Session store error:', error.message);
  });
} else {
  // Development only: express-session uses its default MemoryStore.
  console.warn(
    'WARNING: MongoDB is not configured. Development sessions are temporary and will not survive server restarts.'
  );
}

// ─────────────────────────────────────────────
// Session middleware
// ─────────────────────────────────────────────

app.use(session({
  ...(sessionStore ? { store: sessionStore } : {}),

  name: 'skillbridge.sid',
  secret: SESSION_SECRET,

  resave: false,
  saveUninitialized: false,
  rolling: false,

  cookie: {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// ─────────────────────────────────────────────
// Global template variables
// ─────────────────────────────────────────────

app.use((req, res, next) => {
  res.locals.currentUser = req.session?.user || null;
  res.locals.currentPath = req.path;
  next();
});

// ─────────────────────────────────────────────
// Mount routes
// ─────────────────────────────────────────────

app.use('/', indexRoutes);
app.use('/student', studentRoutes);
app.use('/alumni', alumniRoutes);
app.use('/projects', projectRoutes);
app.use('/admin', adminRoutes);
app.use('/messages', messageRoutes);
app.use('/reviews', reviewRoutes);

// Shared authentication for all account roles.
app.use('/', authRoutes);

// ─────────────────────────────────────────────
// 404 handler
// ─────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).render('404', {
    title: 'Page Not Found — SkillBridge'
  });
});

// ─────────────────────────────────────────────
// Global error handler
// ─────────────────────────────────────────────

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  console.error('Application error:', error.stack || error.message);

  const statusCode =
    Number.isInteger(error.status) &&
    error.status >= 400 &&
    error.status < 600
      ? error.status
      : 500;

  return res.status(statusCode).render('500', {
    title: 'Server Error — SkillBridge',
    error: IS_PRODUCTION
      ? 'An unexpected error occurred. Please try again later.'
      : error.message
  });
});

// ─────────────────────────────────────────────
// Start server
// ─────────────────────────────────────────────

async function startServer() {
  try {
    console.log('Starting SkillBridge...');

    if (MONGO_URI) {
      const connected = await connectDB();

      if (!connected || !mongoose.connection.db) {
        throw new Error(
          'MongoDB connection failed. Server startup cancelled.'
        );
      }

      console.log(
        `MongoDB ready: ${mongoose.connection.name}`
      );
    } else if (IS_PRODUCTION) {
      throw new Error(
        'Production deployment requires MongoDB.'
      );
    } else {
      console.warn(
        'Starting in development mode without MongoDB.'
      );
    }

    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(
        `SkillBridge running in ${NODE_ENV} mode on port ${PORT}`
      );
    });

    server.on('error', error => {
      console.error('HTTP server error:', error.message);
      process.exitCode = 1;
    });

    return server;

  } catch (error) {
    console.error('SkillBridge startup failed:', error.message);
    process.exitCode = 1;
    return null;
  }
}

if (require.main === module) {
  startServer();
}

module.exports = app;
module.exports.startServer = startServer;
