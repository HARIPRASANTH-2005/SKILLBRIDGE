// ─────────────────────────────────────────────
//  app.js  —  Express application entry point
// ─────────────────────────────────────────────
require('dotenv').config();          // Load .env FIRST
const express    = require('express');
const path       = require('path');
const session    = require('express-session');
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

// ── Session middleware ─────────────────────────────
app.use(session({
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
  console.error(err.stack);
  res.status(500).render('500', { title: 'Server Error — SkillBridge', error: err.message });
});

// ── Start server ───────────────────────────────────
// ── Start server ───────────────────────────────────
const PORT = process.env.PORT || 3000;

if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SkillBridge running on port ${PORT}`);
  });
}

module.exports = app;