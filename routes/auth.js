// // ─────────────────────────────────────────────
// //  routes/auth.js  —  Authentication & Verification Status
// // ─────────────────────────────────────────────
// const express = require('express');
// const router  = express.Router();
// const bcrypt  = require('bcryptjs');
// const User    = require('../models/User');
// const { isDbConnected } = require('../config/db');

// // GET /login  → Show login form
// router.get('/login', (req, res) => {
//   if (req.session.user) {
//     const role = req.session.user.role;
//     const redirectMap = {
//       student : '/student/dashboard',
//       alumni  : '/alumni/dashboard',
//       admin   : '/admin/dashboard'
//     };
//     return res.redirect(redirectMap[role] || '/');
//   }

//   res.render('auth/login', {
//     title   : 'Sign In — SkillBridge',
//     errors  : [],
//     formData: {},
//     returnTo: req.query.returnTo || ''
//   });
// });

// // POST /login  → Process login
// router.post('/login', async (req, res) => {
//   const { email, password, returnTo } = req.body;

//   if (!email || !password) {
//     return res.render('auth/login', {
//       title   : 'Sign In — SkillBridge',
//       errors  : [{ msg: 'Institutional email and password are required.' }],
//       formData: { email },
//       returnTo
//     });
//   }

//   const cleanEmail = email.toLowerCase().trim();

//   // If DB is connected, authenticate against real records
//   if (isDbConnected()) {
//     try {
//       const user = await User.findOne({ email: cleanEmail });
//       if (!user) {
//         return res.render('auth/login', {
//           title   : 'Sign In — SkillBridge',
//           errors  : [{ msg: 'Invalid institutional email or password.' }],
//           formData: { email },
//           returnTo
//         });
//       }

//       const isMatch = await bcrypt.compare(password, user.password);
//       if (!isMatch) {
//         return res.render('auth/login', {
//           title   : 'Sign In — SkillBridge',
//           errors  : [{ msg: 'Invalid institutional email or password.' }],
//           formData: { email },
//           returnTo
//         });
//       }

//       req.session.user = {
//         _id: user._id,
//         fullName: user.fullName,
//         email: user.email,
//         role: user.role,
//         status: user.status,
//         rollNumber: user.rollNumber,
//         currentYear: user.currentYear,
//         graduationYear: user.graduationYear,
//         company: user.company,
//         profession: user.profession,
//         documentFilename: user.documentFilename
//       };

//       if (user.status === 'pending') {
//         return res.redirect(`/status?q=${encodeURIComponent(user.email)}`);
//       }

//       if (user.status === 'rejected') {
//         return res.redirect(`/status?q=${encodeURIComponent(user.email)}`);
//       }

//       if (returnTo && returnTo.startsWith('/')) {
//         return res.redirect(returnTo);
//       }

//       const roleRedirect = {
//         student: '/student/dashboard',
//         alumni: '/alumni/dashboard',
//         admin: '/admin/dashboard'
//       };
//       return res.redirect(roleRedirect[user.role] || '/');
//     } catch (err) {
//       console.error('Login error:', err.message);
//       return res.render('auth/login', {
//         title   : 'Sign In — SkillBridge',
//         errors  : [{ msg: 'Authentication service temporarily unavailable. Please retry.' }],
//         formData: { email },
//         returnTo
//       });
//     }
//   }

//   // Graceful offline demo fallback
//   if (cleanEmail.includes('admin')) {
//     req.session.user = {
//       _id: '000000000000000000000001',
//       fullName: 'Department Platform Administrator',
//       email: cleanEmail,
//       role: 'admin',
//       status: 'approved',
//       rollNumber: 'ADMIN-01'
//     };
//     return res.redirect('/admin/dashboard');
//   } else if (cleanEmail.includes('pending')) {
//     req.session.user = {
//       _id: '000000000000000000000002',
//       fullName: 'Kavitha Murugan',
//       email: cleanEmail,
//       rollNumber: '24MCA031',
//       role: 'student',
//       status: 'pending'
//     };
//     return res.redirect(`/status?q=${encodeURIComponent(cleanEmail)}`);
//   } else if (cleanEmail.includes('rejected')) {
//     req.session.user = {
//       _id: '000000000000000000000003',
//       fullName: 'Applicant Demo',
//       email: cleanEmail,
//       rollNumber: '22MCA099',
//       role: 'student',
//       status: 'rejected'
//     };
//     return res.redirect(`/status?q=${encodeURIComponent(cleanEmail)}`);
//   } else if (cleanEmail.includes('alumni') || cleanEmail.includes('karthik')) {
//     req.session.user = {
//       _id: '000000000000000000000004',
//       fullName: 'Karthik Subramaniam',
//       email: cleanEmail,
//       rollNumber: '17MCA042',
//       graduationYear: '2019',
//       profession: 'Senior Software Engineer',
//       company: 'AWS',
//       role: 'alumni',
//       status: 'approved'
//     };
//     return res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/alumni/dashboard');
//   } else {
//     req.session.user = {
//       _id: '000000000000000000000005',
//       fullName: 'Hari Prasanth M',
//       email: cleanEmail,
//       rollNumber: '24MCA018',
//       role: 'student',
//       status: 'approved'
//     };
//     return res.redirect(returnTo && returnTo.startsWith('/') ? returnTo : '/student/dashboard');
//   }
// });

// // GET /logout  → Destroy session and redirect home
// router.get('/logout', (req, res) => {
//   req.session.destroy(err => {
//     if (err) console.error('Session destroy error:', err);
//     res.redirect('/');
//   });
// });

// // GET /status  → Registration verification status lookup
// router.get('/status', async (req, res) => {
//   const query = (req.query.q || '').trim();
//   let userResult = null;
//   let notFound = false;

//   if (query && isDbConnected()) {
//     try {
//       userResult = await User.findOne({
//         $or: [
//           { email: query.toLowerCase() },
//           { rollNumber: query.toUpperCase() }
//         ]
//       }).lean();

//       if (!userResult) {
//         notFound = true;
//       }
//     } catch (err) {
//       console.error('Status lookup error:', err.message);
//     }
//   }

//   res.render('auth/status', {
//     title: 'Verification Status — SkillBridge',
//     query,
//     userResult,
//     notFound,
//     dbUnavailable: !isDbConnected()
//   });
// });

// // GET /forgot-password  → Forgot password interface
// router.get('/forgot-password', (req, res) => {
//   res.render('auth/forgot-password', {
//     title: 'Reset Password — SkillBridge',
//     success: null,
//     error: null
//   });
// });

// // POST /forgot-password  → Handle reset link request
// router.post('/forgot-password', (req, res) => {
//   const { email } = req.body;
//   if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
//     return res.render('auth/forgot-password', {
//       title: 'Reset Password — SkillBridge',
//       success: null,
//       error: 'Please provide a valid institutional email address.'
//     });
//   }

//   res.render('auth/forgot-password', {
//     title: 'Reset Password — SkillBridge',
//     success: `If an approved account exists for ${email}, a password reset link has been dispatched to your institutional inbox.`,
//     error: null
//   });
// });

// module.exports = router;














// neew changes


// ─────────────────────────────────────────────
// routes/auth.js
// Shared Authentication & Verification Status
// ─────────────────────────────────────────────

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');

const User = require('../models/User');
const { isDbConnected } = require('../config/db');


// ─────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────

/**
 * Validates an email address.
 */
const isValidEmail = (email) => {
  return (
    typeof email === 'string' &&
    email.length <= 254 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
};

/**
 * Prevents external or protocol-relative redirects.
 * Only accepts safe paths within this application.
 */
const isSafeReturnTo = (path) => {
  if (typeof path !== 'string' || !path.startsWith('/')) {
    return false;
  }

  if (path.startsWith('//') || path.includes('\\')) {
    return false;
  }

  if (/[\r\n]/.test(path)) {
    return false;
  }

  try {
    const parsed = new URL(path, 'http://skillbridge.local');
    return parsed.origin === 'http://skillbridge.local';
  } catch {
    return false;
  }
};

/**
 * Regenerates the session ID after successful authentication.
 */
const regenerateSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.regenerate((err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};

/**
 * Saves the session before sending the response.
 */
const saveSession = (req) => {
  return new Promise((resolve, reject) => {
    req.session.save((err) => {
      if (err) {
        return reject(err);
      }

      resolve();
    });
  });
};

/**
 * Common login page renderer.
 */
const renderLogin = (
  res,
  {
    errors = [],
    formData = {},
    returnTo = '',
    verifiedSuccess = null,
    statusCode = 200
  } = {}
) => {
  return res.status(statusCode).render('auth/login', {
    title: 'Sign In — SkillBridge',
    errors,
    formData,
    verifiedSuccess,
    returnTo
  });
};

/**
 * Redirects an authenticated user to the correct dashboard.
 */
const getDashboardPath = (role) => {
  const redirectMap = {
    student: '/student/dashboard',
    alumni: '/alumni/dashboard',
    admin: '/admin/dashboard'
  };

  return redirectMap[role] || '/';
};


// ─────────────────────────────────────────────
// GET /login
// Display shared login page
// ─────────────────────────────────────────────

router.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect(
      getDashboardPath(req.session.user.role)
    );
  }

  const isVerified = req.query.verified === 'true' || req.query.registered === 'success';

  res.render('auth/login', {
    title: 'Sign In — SkillBridge',
    errors: [],
    formData: {},
    verifiedSuccess: isVerified
      ? 'Email verified successfully! Your application has been submitted for administrator verification. You can log in once approved.'
      : null,
    returnTo: isSafeReturnTo(req.query.returnTo)
      ? req.query.returnTo
      : ''
  });
});


// ─────────────────────────────────────────────
// POST /login
// Authenticate Student, Alumni or Admin
// ─────────────────────────────────────────────

router.post('/login', async (req, res) => {
  const { email, password, returnTo } = req.body;

  const cleanEmail =
    typeof email === 'string'
      ? email.trim().toLowerCase()
      : '';

  const requestedReturnTo = isSafeReturnTo(returnTo)
    ? returnTo
    : '';

  const sessionReturnTo =
    req.session && isSafeReturnTo(req.session.returnTo)
      ? req.session.returnTo
      : '';

  const destination = requestedReturnTo || sessionReturnTo;

  if (
    !cleanEmail ||
    typeof password !== 'string' ||
    !password
  ) {
    return renderLogin(res, {
      errors: [
        { msg: 'Institutional email and password are required.' }
      ],
      formData: { email: cleanEmail },
      returnTo: destination
    });
  }

  if (!isValidEmail(cleanEmail)) {
    return renderLogin(res, {
      errors: [
        { msg: 'Please provide a valid email address.' }
      ],
      formData: { email: cleanEmail },
      returnTo: destination
    });
  }

  // A real database connection is mandatory.
  // Never authenticate using fake/demo accounts.
  if (!isDbConnected()) {
    return renderLogin(res, {
      errors: [
        {
          msg: 'Authentication is temporarily unavailable because the database is not connected. Please try again later.'
        }
      ],
      formData: { email: cleanEmail },
      returnTo: destination,
      statusCode: 503
    });
  }

  try {
    // Explicitly include password because the updated
    // User schema excludes it from normal queries.
    const user = await User.findOne({
      email: cleanEmail
    }).select('+password');

    if (!user) {
      return renderLogin(res, {
        errors: [
          { msg: 'Invalid institutional email or password.' }
        ],
        formData: { email: cleanEmail },
        returnTo: destination
      });
    }

    const isMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!isMatch) {
      return renderLogin(res, {
        errors: [
          { msg: 'Invalid institutional email or password.' }
        ],
        formData: { email: cleanEmail },
        returnTo: destination
      });
    }

    // Pending and rejected accounts cannot access dashboards.
    if (user.status !== 'approved') {
      return res.redirect(
        `/status?q=${encodeURIComponent(user.email)}`
      );
    }

    // Only supported roles are allowed.
    const allowedRoles = ['student', 'alumni', 'admin'];

    if (!allowedRoles.includes(user.role)) {
      return renderLogin(res, {
        errors: [
          { msg: 'This account does not have a valid platform role.' }
        ],
        formData: { email: cleanEmail },
        returnTo: destination
      });
    }

    // Regenerate session ID to prevent session fixation.
    await regenerateSession(req);

    // Store only the information required by the application.
    // Never store the password or password hash in the session.
    req.session.user = {
      _id: user._id.toString(),
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.status,
      rollNumber: user.rollNumber || '',
      currentYear: user.currentYear || null,
      graduationYear: user.graduationYear || '',
      company: user.company || '',
      profession: user.profession || '',
      documentFilename: user.documentFilename || ''
    };

    await saveSession(req);

    return res.redirect(
      destination || getDashboardPath(user.role)
    );

  } catch (err) {
    console.error('Login error:', err.message);

    return renderLogin(res, {
      errors: [
        {
          msg: 'Authentication service temporarily unavailable. Please try again.'
        }
      ],
      formData: { email: cleanEmail },
      returnTo: destination,
      statusCode: 503
    });
  }
});


// ─────────────────────────────────────────────
// GET /logout
// Destroy current session
// ─────────────────────────────────────────────

router.get('/logout', (req, res) => {
  if (!req.session) {
    return res.redirect('/');
  }

  req.session.destroy((err) => {
    if (err) {
      console.error('Session destroy error:', err.message);
      return res.status(500).send(
        'Unable to log out. Please try again.'
      );
    }

    // Must match the cookie name configured in app.js.
    res.clearCookie('skillbridge.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    return res.redirect('/');
  });
});


// ─────────────────────────────────────────────
// GET /status
// Registration verification status lookup
// ─────────────────────────────────────────────

router.get('/status', async (req, res) => {
  const query =
    typeof req.query.q === 'string'
      ? req.query.q.trim()
      : '';

  let userResult = null;
  let notFound = false;

  const dbUnavailable = !isDbConnected();

  if (query && !dbUnavailable) {
    try {
      userResult = await User.findOne({
        $or: [
          { email: query.toLowerCase() },
          { rollNumber: query.toUpperCase() }
        ]
      })
        .select(
          'fullName email rollNumber role status rejectionReason createdAt'
        )
        .lean();

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
    dbUnavailable
  });
});


// ─────────────────────────────────────────────
// GET /forgot-password
// Display password reset interface
// ─────────────────────────────────────────────

router.get('/forgot-password', (req, res) => {
  res.render('auth/forgot-password', {
    title: 'Reset Password — SkillBridge',
    success: null,
    error: null
  });
});


// ─────────────────────────────────────────────
// POST /forgot-password
// Password reset request
// ─────────────────────────────────────────────

router.post('/forgot-password', (req, res) => {
  const email =
    typeof req.body.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '';

  if (!isValidEmail(email)) {
    return res.render('auth/forgot-password', {
      title: 'Reset Password — SkillBridge',
      success: null,
      error: 'Please provide a valid institutional email address.'
    });
  }

  // Actual email delivery and secure token-based password
  // reset have not been implemented yet.
  return res.render('auth/forgot-password', {
    title: 'Reset Password — SkillBridge',
    success: null,
    error:
      'Password reset is not available yet. Please contact the Platform Administrator for assistance.'
  });
});


module.exports = router;
