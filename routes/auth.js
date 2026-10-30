// ─────────────────────────────────────────────
//  routes/auth.js  —  Authentication & Verification Status
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const User    = require('../models/User');
const { isDbConnected } = require('../config/db');

// GET /login  → Show login form
router.get('/login', (req, res) => {
  if (req.session.user) {
    const role = req.session.user.role;
    const redirectMap = {
      student : '/student/dashboard',
      alumni  : '/alumni/dashboard',
      admin   : '/admin/dashboard'
    };
    return res.redirect(redirectMap[role] || '/');
  }

  res.render('auth/login', {
    title   : 'Sign In — SkillBridge',
    errors  : [],
    formData: {},
    returnTo: req.query.returnTo || ''
  });
});

// POST /login  → Process login
router.post('/login', async (req, res) => {
  const { email, password, returnTo } = req.body;

  if (!email || !password) {
    return res.render('auth/login', {
      title   : 'Sign In — SkillBridge',
      errors  : [{ msg: 'Institutional email and password are required.' }],
      formData: { email },
      returnTo
    });
  }

  const cleanEmail = email.toLowerCase().trim();

  // If DB is connected, authenticate against real records
  if (isDbConnected()) {
    try {
      const user = await User.findOne({ email: cleanEmail });
      if (!user) {
        return res.render('auth/login', {
          title   : 'Sign In — SkillBridge',
          errors  : [{ msg: 'Invalid institutional email or password.' }],
          formData: { email },
          returnTo
        });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render('auth/login', {
          title   : 'Sign In — SkillBridge',
          errors  : [{ msg: 'Invalid institutional email or password.' }],
          formData: { email },
          returnTo
        });
      }

      req.session.user = {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        status: user.status,
        rollNumber: user.rollNumber,
        currentYear: user.currentYear,
        graduationYear: user.graduationYear,
        company: user.company,
        profession: user.profession,
        documentFilename: user.documentFilename
      };

      if (user.status === 'pending') {
        return res.redirect(`/status?q=${encodeURIComponent(user.email)}`);
      }

      if (user.status === 'rejected') {
        return res.redirect(`/status?q=${encodeURIComponent(user.email)}`);
      }

      if (returnTo && returnTo.startsWith('/')) {
        return res.redirect(returnTo);
      }

      const roleRedirect = {
        student: '/student/dashboard',
        alumni: '/alumni/dashboard',
        admin: '/admin/dashboard'
      };
      return res.redirect(roleRedirect[user.role] || '/');
    } catch (err) {
      console.error('Login error:', err.message);
      return res.render('auth/login', {
        title   : 'Sign In — SkillBridge',
        errors  : [{ msg: 'Authentication service temporarily unavailable. Please retry.' }],
        formData: { email },
        returnTo
      });
    }
  }

  // Graceful offline demo fallback
  if (cleanEmail.includes('admin')) {
    req.session.user = {
      _id: '000000000000000000000001',
      fullName: 'Department Platform Administrator',
      email: cleanEmail,
      role: 'admin',
      status: 'approved',
      rollNumber: 'ADMIN-01'
    };
    return res.redirect('/admin/dashboard');
  } else if (cleanEmail.includes('pending')) {
    req.session.user = {
      _id: '000000000000000000000002',
      fullName: 'Kavitha Murugan',
      email: cleanEmail,
      rollNumber: '24MCA031',
      role: 'student',
      status: 'pending'
    };
    return res.redirect(`/status?q=${encodeURIComponent(cleanEmail)}`);
  } else if (cleanEmail.includes('rejected')) {
    req.session.user = {
      _id: '000000000000000000000003',
      fullName: 'Applicant Demo',
      email: cleanEmail,
      rollNumber: '22MCA099',
      role: 'student',
      status: 'rejected'
    };
    return res.redirect(`/status?q=${encodeURIComponent(cleanEmail)}`);
  } else if (cleanEmail.includes('alumni') || cleanEmail.includes('karthik')) {
    req.session.user = {
      _id: '000000000000000000000004',
      fullName: 'Karthik Subramaniam',
      email: cleanEmail,
      rollNumber: '17MCA042',
      graduationYear: '2019',
      profession: 'Senior Software Engineer',
      company: 'AWS',
      role: 'alumni',
      status: 'approved'
    };
    return res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/alumni/dashboard');
  } else {
    req.session.user = {
      _id: '000000000000000000000005',
      fullName: 'Hari Prasanth M',
      email: cleanEmail,
      rollNumber: '24MCA018',
      role: 'student',
      status: 'approved'
    };
    return res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/student/dashboard');
  }
});

// GET /logout  → Destroy session and redirect home
router.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) console.error('Session destroy error:', err);
    res.redirect('/');
  });
});

// GET /status  → Registration verification status lookup
router.get('/status', async (req, res) => {
  const query = (req.query.q || '').trim();
  let userResult = null;
  let notFound = false;

  if (query && isDbConnected()) {
    try {
      userResult = await User.findOne({
        $or: [
          { email: query.toLowerCase() },
          { rollNumber: query.toUpperCase() }
        ]
      }).lean();

      if (!userResult) {
        notFound = true;
      }
    } catch (err) {
      console.error('Status lookup error:', err.message);
    }
  }

  res.render('auth/status', {
    title: 'Verification Status — SkillBridge',
    query,
    userResult,
    notFound,
    dbUnavailable: !isDbConnected()
  });
});

// GET /forgot-password  → Forgot password interface
router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Reset Password — SkillBridge',
    success: null,
    error: null
  });
});

// POST /forgot-password  → Handle reset link request
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.render('auth/forgot-password', {
      title: 'Reset Password — SkillBridge',
      success: null,
      error: 'Please provide a valid institutional email address.'
    });
  }

  res.render('auth/forgot-password', {
    title: 'Reset Password — SkillBridge',
    success: `If an approved account exists for ${email}, a password reset link has been dispatched to your institutional inbox.`,
    error: null
  });
});

module.exports = router;
