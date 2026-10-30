// ─────────────────────────────────────────────
//  middleware/auth.js  —  Authentication & Verification Gating
// ─────────────────────────────────────────────

/**
 * Ensures the user is logged in.
 */
const requireAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    if (req.method === 'GET') {
      req.session.returnTo = req.originalUrl;
    }
    return res.redirect('/login');
  }
  next();
};

/**
 * Ensures the user is an approved/verified member of the platform.
 * Pending or Rejected users are blocked from project collaboration.
 */
const requireApproved = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/login');
  }

  // Administrators bypass verification gate
  if (req.session.user.role === 'admin') {
    return next();
  }

  if (req.session.user.status !== 'approved') {
    return res.status(403).render('auth/status', {
      title: 'Application Pending Verification — SkillBridge',
      query: req.session.user.email || req.session.user.rollNumber,
      message: 'Access to project collaboration features will be enabled once your application has been approved by the Platform Administrator.'
    });
  }

  next();
};

/**
 * Ensures the user possesses one of the permitted roles.
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }

    if (!roles.includes(req.session.user.role)) {
      return res.status(403).render('500', {
        title: '403 — Unauthorized Access',
        error: 'You do not have administrative or role clearance to access this resource.'
      });
    }

    next();
  };
};

/**
 * Ensures the user is a Platform Administrator.
 */
const requireAdmin = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.redirect('/admin/login');
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).render('500', {
      title: '403 — Administrator Clearance Required',
      error: 'Platform Administrator credentials are required to view this system console.'
    });
  }

  next();
};

module.exports = {
  requireAuth,
  requireApproved,
  requireRole,
  requireAdmin
};

