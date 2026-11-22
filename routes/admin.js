// // ─────────────────────────────────────────────
// //  routes/admin.js  —  Platform Administration & Verification System
// // ─────────────────────────────────────────────
// const express = require('express');
// const router  = express.Router();
// const path    = require('path');
// const fs      = require('fs');
// const bcrypt  = require('bcryptjs');
// const User    = require('../models/User');
// const Project = require('../models/Project');
// const { isDbConnected } = require('../config/db');
// const { requireAuth, requireAdmin } = require('../middleware/auth');

// // GET /admin/login  → Dedicated Platform Administrator Login
// router.get('/login', (req, res) => {
//   if (req.session && req.session.user && req.session.user.role === 'admin') {
//     return res.redirect('/admin/dashboard');
//   }

//   res.render('admin/login', {
//     title: 'Platform Administrator Sign In — SkillBridge',
//     errors: [],
//     formData: {}
//   });
// });

// // POST /admin/login  → Authenticate Administrator
// router.post('/login', async (req, res) => {
//   const { email, password } = req.body;
//   const errors = [];

//   if (!email || !password) {
//     errors.push({ msg: 'Institutional email and password are required.' });
//     return res.render('admin/login', {
//       title: 'Platform Administrator Sign In — SkillBridge',
//       errors,
//       formData: { email }
//     });
//   }

//   const cleanEmail = email.toLowerCase().trim();

//   // If MongoDB is offline, provide helpful reassurance
//   if (!isDbConnected()) {
//     // If running in development/demo without MongoDB, allow demo admin if email matches
//     if (cleanEmail.includes('admin') && password.length >= 8) {
//       req.session.user = {
//         _id: '000000000000000000000001',
//         fullName: 'Department Platform Administrator',
//         email: cleanEmail,
//         role: 'admin',
//         status: 'approved',
//         rollNumber: 'ADMIN-01'
//       };
//       return res.redirect('/admin/dashboard');
//     }

//     errors.push({ msg: 'Database connection offline. Platform administration requires active database connection.' });
//     return res.render('admin/login', {
//       title: 'Platform Administrator Sign In — SkillBridge',
//       errors,
//       formData: { email }
//     });
//   }

//   try {
//     const adminUser = await User.findOne({ email: cleanEmail, role: 'admin' });
//     if (!adminUser) {
//       errors.push({ msg: 'Invalid administrator credentials or unverified console clearance.' });
//       return res.render('admin/login', {
//         title: 'Platform Administrator Sign In — SkillBridge',
//         errors,
//         formData: { email }
//       });
//     }

//     const isMatch = await bcrypt.compare(password, adminUser.password);
//     if (!isMatch) {
//       errors.push({ msg: 'Invalid administrator credentials or unverified console clearance.' });
//       return res.render('admin/login', {
//         title: 'Platform Administrator Sign In — SkillBridge',
//         errors,
//         formData: { email }
//       });
//     }

//     req.session.user = {
//       _id: adminUser._id,
//       fullName: adminUser.fullName,
//       email: adminUser.email,
//       role: adminUser.role,
//       status: adminUser.status,
//       rollNumber: adminUser.rollNumber
//     };

//     res.redirect('/admin/dashboard');
//   } catch (err) {
//     console.error('Admin login error:', err.message);
//     errors.push({ msg: 'An authentication error occurred. Please try again.' });
//     res.render('admin/login', {
//       title: 'Platform Administrator Sign In — SkillBridge',
//       errors,
//       formData: { email }
//     });
//   }
// });

// // GET /admin/dashboard  → Admin dashboard overview
// router.get('/dashboard', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.render('admin/dashboard', {
//       title: 'Department Admin Dashboard — SkillBridge',
//       dbUnavailable: true,
//       stats: { pendingCount: 0, verifiedUsers: 0, activeProjects: 0, totalProposals: 0 },
//       recentPending: []
//     });
//   }

//   try {
//     const [pendingCount, verifiedUsers, activeProjects, recentPending] = await Promise.all([
//       User.countDocuments({ status: 'pending' }),
//       User.countDocuments({ status: 'approved' }),
//       Project.countDocuments({ status: 'open' }),
//       User.find({ status: 'pending' }).sort({ createdAt: -1 }).limit(5).lean()
//     ]);

//     res.render('admin/dashboard', {
//       title: 'Department Admin Dashboard — SkillBridge',
//       dbUnavailable: false,
//       stats: {
//         pendingCount,
//         verifiedUsers,
//         activeProjects,
//         totalProposals: 0
//       },
//       recentPending
//     });
//   } catch (err) {
//     console.error('Admin dashboard error:', err.message);
//     res.render('admin/dashboard', {
//       title: 'Department Admin Dashboard — SkillBridge',
//       dbUnavailable: true,
//       stats: { pendingCount: 0, verifiedUsers: 0, activeProjects: 0, totalProposals: 0 },
//       recentPending: []
//     });
//   }
// });

// // GET /admin/verifications  → Verification queue
// router.get('/verifications', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.render('admin/verifications', {
//       title: 'Verification Queue — SkillBridge',
//       dbUnavailable: true,
//       applications: [],
//       pendingCount: 0,
//       message: req.query.msg || null
//     });
//   }

//   try {
//     const applications = await User.find({ status: 'pending' })
//       .sort({ createdAt: -1 })
//       .lean();

//     res.render('admin/verifications', {
//       title: 'Verification Queue — SkillBridge',
//       dbUnavailable: false,
//       applications,
//       pendingCount: applications.length,
//       message: req.query.msg || null
//     });
//   } catch (err) {
//     console.error('Verification queue error:', err.message);
//     res.render('admin/verifications', {
//       title: 'Verification Queue — SkillBridge',
//       dbUnavailable: true,
//       applications: [],
//       pendingCount: 0,
//       message: null
//     });
//   }
// });

// // GET /admin/verifications/:id  → Review specific applicant details
// router.get('/verifications/:id', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.status(503).render('500', {
//       title: '503 — Service Unavailable',
//       error: 'Database is currently offline. Applicant details cannot be loaded.'
//     });
//   }

//   try {
//     const applicant = await User.findById(req.params.id).lean();
//     if (!applicant) {
//       return res.status(404).render('404', { title: 'Applicant Not Found' });
//     }

//     res.render('admin/verification-detail', {
//       title: `Verify ${applicant.fullName} — SkillBridge`,
//       applicant,
//       error: req.query.err || null
//     });
//   } catch (err) {
//     res.status(404).render('404', { title: 'Applicant Not Found' });
//   }
// });

// // POST /admin/verifications/:id/approve  → Approve applicant
// router.post('/verifications/:id/approve', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.status(503).render('500', {
//       title: '503 — Service Unavailable',
//       error: 'Database is offline. Approval decision could not be processed.'
//     });
//   }

//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).render('404', { title: 'Applicant Not Found' });
//     }

//     user.status = 'approved';
//     user.rejectionReason = '';
//     user.verificationHistory.push({
//       reviewerId: req.session.user._id,
//       reviewerName: req.session.user.fullName || 'Department Administrator',
//       decision: 'approved',
//       reason: 'Academic and identity credentials verified against registrar records.',
//       timestamp: new Date()
//     });

//     await user.save();
//     res.redirect('/admin/verifications?msg=approved');
//   } catch (err) {
//     console.error('Approve error:', err.message);
//     res.redirect(`/admin/verifications/${req.params.id}?err=Failed+to+approve+account`);
//   }
// });

// // POST /admin/verifications/:id/reject  → Reject applicant with mandatory reason
// router.post('/verifications/:id/reject', requireAdmin, async (req, res) => {
//   const { reason } = req.body;

//   if (!reason || reason.trim().length < 10) {
//     return res.redirect(`/admin/verifications/${req.params.id}?err=Rejection+reason+is+mandatory+(minimum+10+characters)`);
//   }

//   if (!isDbConnected()) {
//     return res.status(503).render('500', {
//       title: '503 — Service Unavailable',
//       error: 'Database is offline. Rejection decision could not be processed.'
//     });
//   }

//   try {
//     const user = await User.findById(req.params.id);
//     if (!user) {
//       return res.status(404).render('404', { title: 'Applicant Not Found' });
//     }

//     user.status = 'rejected';
//     user.rejectionReason = reason.trim();
//     user.verificationHistory.push({
//       reviewerId: req.session.user._id,
//       reviewerName: req.session.user.fullName || 'Department Administrator',
//       decision: 'rejected',
//       reason: reason.trim(),
//       timestamp: new Date()
//     });

//     await user.save();
//     res.redirect('/admin/verifications?msg=rejected');
//   } catch (err) {
//     console.error('Reject error:', err.message);
//     res.redirect(`/admin/verifications/${req.params.id}?err=Failed+to+record+rejection`);
//   }
// });

// // GET /admin/documents/:filename  → Secure private document streaming
// router.get('/documents/:filename', requireAuth, (req, res) => {
//   // Prevent directory traversal: isolate filename only
//   const filename = path.basename(req.params.filename);

//   // Authorization check: User must be an admin OR the document owner
//   const isAuthorizedAdmin = req.session.user.role === 'admin';
//   const isDocumentOwner = req.session.user.documentFilename === filename;

//   if (!isAuthorizedAdmin && !isDocumentOwner) {
//     return res.status(403).render('500', {
//       title: '403 — Unauthorized Document Access',
//       error: 'You do not have clearance to inspect this verification document.'
//     });
//   }

//   const filePath = path.join(__dirname, '../uploads', filename);

//   if (!fs.existsSync(filePath)) {
//     return res.status(404).render('404', {
//       title: 'Document Not Found — SkillBridge'
//     });
//   }

//   // Prevent browser caching of private academic documents
//   res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
//   res.setHeader('Pragma', 'no-cache');
//   res.setHeader('Expires', '0');

//   res.sendFile(filePath);
// });

// // GET /admin/users  → User directory
// router.get('/users', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.render('admin/users', {
//       title: 'User Management — SkillBridge',
//       dbUnavailable: true,
//       users: []
//     });
//   }

//   try {
//     const users = await User.find().sort({ createdAt: -1 }).lean();
//     res.render('admin/users', {
//       title: 'User Management — SkillBridge',
//       dbUnavailable: false,
//       users
//     });
//   } catch (err) {
//     res.render('admin/users', {
//       title: 'User Management — SkillBridge',
//       dbUnavailable: true,
//       users: []
//     });
//   }
// });

// // GET /admin/projects  → Projects moderation
// router.get('/projects', requireAdmin, async (req, res) => {
//   if (!isDbConnected()) {
//     return res.render('admin/projects', {
//       title: 'Project Moderation — SkillBridge',
//       dbUnavailable: true,
//       projects: []
//     });
//   }

//   try {
//     const projects = await Project.find().sort({ createdAt: -1 }).lean();
//     res.render('admin/projects', {
//       title: 'Project Moderation — SkillBridge',
//       dbUnavailable: false,
//       projects
//     });
//   } catch (err) {
//     res.render('admin/projects', {
//       title: 'Project Moderation — SkillBridge',
//       dbUnavailable: true,
//       projects: []
//     });
//   }
// });

// module.exports = router;













// new changes

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');

const { isDbConnected } = require('../config/db');
const { requireAdmin } = require('../middleware/auth');

const APPLICANT_ROLES = ['student', 'alumni'];

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

function renderUnavailable(res, message) {
  return res.status(503).render('500', {
    title: '503 — Service Unavailable',
    error: message
  });
}

function renderNotFound(res) {
  return res.status(404).render('404', {
    title: 'Not Found — SkillBridge'
  });
}

// ─────────────────────────────────────────────
// Legacy admin login URLs
// Authentication is handled only by /login.
// ─────────────────────────────────────────────

router.get('/login', (req, res) => {
  return res.redirect('/login');
});

router.post('/login', (req, res) => {
  return res.redirect(303, '/login');
});

// ─────────────────────────────────────────────
// GET /admin/dashboard
// Administrator dashboard
// ─────────────────────────────────────────────

router.get('/dashboard', requireAdmin, async (req, res) => {
  if (!isDbConnected()) {
    return renderUnavailable(
      res,
      'Database connection is unavailable. Please try again later.'
    );
  }

  try {
    const [
      pendingCount,
      verifiedUsers,
      activeProjects,
      totalProposals,
      recentPending
    ] = await Promise.all([
      User.countDocuments({
        role: { $in: APPLICANT_ROLES },
        status: 'pending'
      }),

      User.countDocuments({
        role: { $in: APPLICANT_ROLES },
        status: 'approved'
      }),

      Project.countDocuments({
        status: 'open'
      }),

      Proposal.countDocuments(),

      User.find({
        role: { $in: APPLICANT_ROLES },
        status: 'pending'
      })
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(5)
        .lean()
    ]);

    return res.render('admin/dashboard', {
      title: 'Department Admin Dashboard — SkillBridge',
      dbUnavailable: false,
      stats: {
        pendingCount,
        verifiedUsers,
        activeProjects,
        totalProposals
      },
      recentPending
    });

  } catch (error) {
    console.error('Admin dashboard error:', error.message);

    return res.status(500).render('admin/dashboard', {
      title: 'Department Admin Dashboard — SkillBridge',
      dbUnavailable: true,
      stats: {
        pendingCount: 0,
        verifiedUsers: 0,
        activeProjects: 0,
        totalProposals: 0
      },
      recentPending: []
    });
  }
});

// ─────────────────────────────────────────────
// GET /admin/verifications
// Verification queue
// ─────────────────────────────────────────────

router.get('/verifications', requireAdmin, async (req, res) => {
  if (!isDbConnected()) {
    return res.render('admin/verifications', {
      title: 'Verification Queue — SkillBridge',
      dbUnavailable: true,
      applications: [],
      pendingCount: 0,
      message: null
    });
  }

  try {
    const applications = await User.find({
      role: { $in: APPLICANT_ROLES },
      status: 'pending'
    })
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.render('admin/verifications', {
      title: 'Verification Queue — SkillBridge',
      dbUnavailable: false,
      applications,
      pendingCount: applications.length,
      message: req.query.msg || null
    });

  } catch (error) {
    console.error('Verification queue error:', error.message);

    return res.status(500).render('admin/verifications', {
      title: 'Verification Queue — SkillBridge',
      dbUnavailable: true,
      applications: [],
      pendingCount: 0,
      message: null
    });
  }
});

// ─────────────────────────────────────────────
// GET /admin/verifications/:id
// Review applicant details
// ─────────────────────────────────────────────

router.get('/verifications/:id', requireAdmin, async (req, res) => {
  if (!isValidObjectId(req.params.id)) {
    return renderNotFound(res);
  }

  if (!isDbConnected()) {
    return renderUnavailable(
      res,
      'Database is offline. Applicant details cannot be loaded.'
    );
  }

  try {
    const applicant = await User.findOne({
      _id: req.params.id,
      role: { $in: APPLICANT_ROLES }
    })
      .select('-password')
      .lean();

    if (!applicant) {
      return renderNotFound(res);
    }

    return res.render('admin/verification-detail', {
      title: `Verify ${applicant.fullName} — SkillBridge`,
      applicant,
      error: req.query.err || null
    });

  } catch (error) {
    console.error('Applicant detail error:', error.message);
    return renderNotFound(res);
  }
});

// ─────────────────────────────────────────────
// POST /admin/verifications/:id/approve
// Approve a pending student/alumni account
// ─────────────────────────────────────────────

router.post(
  '/verifications/:id/approve',
  requireAdmin,
  async (req, res) => {
    const applicantId = req.params.id;

    if (!isValidObjectId(applicantId)) {
      return renderNotFound(res);
    }

    if (!isDbConnected()) {
      return renderUnavailable(
        res,
        'Database is offline. Approval could not be processed.'
      );
    }

    try {
      const reviewerId = req.session.user._id;
      const reviewerName =
        req.session.user.fullName || 'Department Administrator';

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: applicantId,
          role: { $in: APPLICANT_ROLES },
          status: 'pending'
        },
        {
          $set: {
            status: 'approved',
            rejectionReason: ''
          },
          $push: {
            verificationHistory: {
              reviewerId,
              reviewerName,
              decision: 'approved',
              reason: 'Academic and identity credentials verified against department records.',
              timestamp: new Date()
            }
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedUser) {
        const existingUser = await User.findOne({
          _id: applicantId,
          role: { $in: APPLICANT_ROLES }
        }).select('_id status');

        if (!existingUser) {
          return renderNotFound(res);
        }

        return res.redirect(
          '/admin/verifications?msg=already-reviewed'
        );
      }

      return res.redirect('/admin/verifications?msg=approved');

    } catch (error) {
      console.error('Approve error:', error.message);

      return res.redirect(
        `/admin/verifications/${applicantId}?err=Failed+to+approve+account`
      );
    }
  }
);

// ─────────────────────────────────────────────
// POST /admin/verifications/:id/reject
// Reject a pending account with a reason
// ─────────────────────────────────────────────

router.post(
  '/verifications/:id/reject',
  requireAdmin,
  async (req, res) => {
    const applicantId = req.params.id;

    if (!isValidObjectId(applicantId)) {
      return renderNotFound(res);
    }

    const reason = typeof req.body.reason === 'string'
      ? req.body.reason.trim()
      : '';

    if (reason.length < 10 || reason.length > 1000) {
      return res.redirect(
        `/admin/verifications/${applicantId}?err=Rejection+reason+must+be+between+10+and+1000+characters`
      );
    }

    if (!isDbConnected()) {
      return renderUnavailable(
        res,
        'Database is offline. Rejection could not be processed.'
      );
    }

    try {
      const reviewerId = req.session.user._id;
      const reviewerName =
        req.session.user.fullName || 'Department Administrator';

      const updatedUser = await User.findOneAndUpdate(
        {
          _id: applicantId,
          role: { $in: APPLICANT_ROLES },
          status: 'pending'
        },
        {
          $set: {
            status: 'rejected',
            rejectionReason: reason
          },
          $push: {
            verificationHistory: {
              reviewerId,
              reviewerName,
              decision: 'rejected',
              reason,
              timestamp: new Date()
            }
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedUser) {
        const existingUser = await User.findOne({
          _id: applicantId,
          role: { $in: APPLICANT_ROLES }
        }).select('_id status');

        if (!existingUser) {
          return renderNotFound(res);
        }

        return res.redirect(
          '/admin/verifications?msg=already-reviewed'
        );
      }

      return res.redirect('/admin/verifications?msg=rejected');

    } catch (error) {
      console.error('Reject error:', error.message);

      return res.redirect(
        `/admin/verifications/${applicantId}?err=Failed+to+record+rejection`
      );
    }
  }
);

// ─────────────────────────────────────────────
// GET /admin/documents/:filename
// Secure private document streaming
// ─────────────────────────────────────────────

router.get('/documents/:filename', requireAdmin, async (req, res) => {
  const filename = path.basename(req.params.filename);

  // Only accept filenames generated by our upload middleware.
  const validFilename =
    /^doc-\d+-[a-f0-9]+\.(pdf|jpe?g|png)$/i.test(filename);

  if (!validFilename) {
    return renderNotFound(res);
  }

  if (!isDbConnected()) {
    return renderUnavailable(
      res,
      'Database is offline. Documents cannot be accessed.'
    );
  }

  try {
    // A file must belong to a registered account.
    const documentOwner = await User.findOne({
      documentFilename: filename
    }).select('_id');

    if (!documentOwner) {
      return renderNotFound(res);
    }

    const uploadDirectory = path.resolve(__dirname, '../uploads');
    const filePath = path.join(uploadDirectory, filename);

    if (!fs.existsSync(filePath)) {
      return renderNotFound(res);
    }

    res.setHeader(
      'Cache-Control',
      'private, no-cache, no-store, must-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    return res.sendFile(filePath, error => {
      if (error && !res.headersSent) {
        console.error('Document streaming error:', error.message);
        res.status(error.statusCode || 500).end();
      }
    });

  } catch (error) {
    console.error('Document access error:', error.message);

    if (!res.headersSent) {
      return res.status(500).render('500', {
        title: 'Document Access Error',
        error: 'Unable to retrieve the requested document.'
      });
    }
  }
});

// ─────────────────────────────────────────────
// GET /admin/users
// User directory
// ─────────────────────────────────────────────

router.get('/users', requireAdmin, async (req, res) => {
  if (!isDbConnected()) {
    return res.render('admin/users', {
      title: 'User Management — SkillBridge',
      dbUnavailable: true,
      users: []
    });
  }

  try {
    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(200)
      .lean();

    return res.render('admin/users', {
      title: 'User Management — SkillBridge',
      dbUnavailable: false,
      users
    });

  } catch (error) {
    console.error('Admin users error:', error.message);

    return res.status(500).render('admin/users', {
      title: 'User Management — SkillBridge',
      dbUnavailable: true,
      users: []
    });
  }
});

// ─────────────────────────────────────────────
// GET /admin/projects
// Project moderation
// ─────────────────────────────────────────────

router.get('/projects', requireAdmin, async (req, res) => {
  if (!isDbConnected()) {
    return res.render('admin/projects', {
      title: 'Project Moderation — SkillBridge',
      dbUnavailable: true,
      projects: []
    });
  }

  try {
    const projects = await Project.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .lean();

    return res.render('admin/projects', {
      title: 'Project Moderation — SkillBridge',
      dbUnavailable: false,
      projects
    });

  } catch (error) {
    console.error('Admin projects error:', error.message);

    return res.status(500).render('admin/projects', {
      title: 'Project Moderation — SkillBridge',
      dbUnavailable: true,
      projects: []
    });
  }
});

module.exports = router;
