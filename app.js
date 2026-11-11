// ─────────────────────────────────────────────
//  app.js  —  Express application entry point
// ─────────────────────────────────────────────
require('dotenv').config();          // Load .env FIRST
const express    = require('express');
const path       = require('path');
const session    = require('express-session');
const { MongoStore } = require('connect-mongo');
const mongoose   = require('mongoose');
const helmet     = require('helmet');
const connectDB  = require('./config/db');

// ── Route files ────────────────────────────────────
const indexRoutes   = require('./routes/index');
const studentRoutes = require('./routes/student');
const alumniRoutes  = require('./routes/alumni');
const projectRoutes = require('./routes/projects');
const adminRoutes   = require('./routes/admin');
const messageRoutes = require('./routes/messages');
const reviewRoutes  = require('./routes/reviews');
const authRoutes    = require('./routes/auth');

const app = express();

// ── Security Headers ────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false // Allows inline scripts & fonts during development
}));

// ── Connect to MongoDB ──────────────────────────────
connectDB();

// ── View engine (EJS) ──────────────────────────────
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ── Body parsers ───────────────────────────────────
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ── Static files ───────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ── Trust Proxy (Required for secure HTTPS cookies behind reverse proxies on Render) ──
app.set('trust proxy', 1);

// ── Session store (MongoDB-backed via connect-mongo) ──
let sessionStore;
if (process.env.MONGO_URI) {
  sessionStore = MongoStore.create({
    clientPromise: mongoose.connection.asPromise().then(conn => {
      const client = conn.getClient();
      if (!client) throw new Error('MongoDB client connection unavailable');
      return client;
    }),
    collectionName: 'sessions',
    ttl: 24 * 60 * 60,                     // 24 hours in seconds
    autoRemove: 'native',
    touchAfter: 24 * 3600                  // Lazy session update
  });

  // Handle store errors and offline mode safely
  sessionStore.collectionP?.catch(err => {
    console.warn('⚠️  Session store offline notice:', err.message);
  });

  sessionStore.on('error', err => {
    console.warn('⚠️  Session store error:', err.message);
  });
}

// ── Session middleware ─────────────────────────────
app.use(session({
  store: sessionStore,
  name: 'skillbridge.sid',
  secret: process.env.SESSION_SECRET || 'skillbridge-graphite-secret-2025',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24            // 24 hours
  }
}));

// ── Global template variable ───────────────────────
app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  next();
});

// ── Mount routes ───────────────────────────────────
app.use('/',          indexRoutes);     // GET /
app.use('/student',   studentRoutes);   // /student/*
app.use('/alumni',    alumniRoutes);    // /alumni/*
app.use('/projects',  projectRoutes);   // /projects/*
app.use('/admin',     adminRoutes);     // /admin/*
app.use('/messages',  messageRoutes);   // /messages/*
app.use('/reviews',   reviewRoutes);    // /reviews/*
app.use('/',          authRoutes);      // /login, /logout, /status, /forgot-password

// ── 404 handler ────────────────────────────────────
app.use((req, res) => {
  res.status(404).render('404', { title: 'Page Not Found — SkillBridge' });
});

// ── Global error handler ───────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error — SkillBridge', error: err.message });
});

// ── Start server ───────────────────────────────────
const PORT = process.env.PORT || 3000;
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`🚀  SkillBridge running at http://localhost:${PORT}`);
  });
}

module.exports = app;
