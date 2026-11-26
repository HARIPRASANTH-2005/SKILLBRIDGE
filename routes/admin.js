


// new changes

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

const User = require('../models/User');
const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const ProjectMember = require('../models/ProjectMember');
const Task = require('../models/Task');
const Review = require('../models/Review');

const { isDbConnected } = require('../config/db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

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

  const emptyStats = {
    pendingCount: 0,
    pendingStudents: 0,
    pendingAlumni: 0,
    verifiedStudents: 0,
    verifiedAlumni: 0,
    activeProjects: 0,
    totalProposals: 0
  };

  try {
    const [
      pendingStudents,
      pendingAlumni,
      verifiedStudents,
      verifiedAlumni,
      activeProjects,
      totalProposals,
      recentPending
    ] = await Promise.all([
      User.countDocuments({
        role: 'student',
        status: 'pending'
      }),

      User.countDocuments({
        role: 'alumni',
        status: 'pending'
      }),

      User.countDocuments({
        role: 'student',
        status: 'approved'
      }),

      User.countDocuments({
        role: 'alumni',
        status: 'approved'
      }),

      Project.countDocuments({
        status: { $in: ['open', 'in_progress'] }
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

    const pendingCount = pendingStudents + pendingAlumni;

    return res.render('admin/dashboard', {
      title: 'Department Admin Dashboard — SkillBridge',
      dbUnavailable: false,

      stats: {
        pendingCount,
        pendingStudents,
        pendingAlumni,
        verifiedStudents,
        verifiedAlumni,
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
      stats: emptyStats,
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
      users: [],
      searchQuery: '',
      roleFilter: '',
      statusFilter: '',
      pendingCount: 0
    });
  }

  try {
    // 1. Read and validate filter parameters
    const searchQuery =
      typeof req.query.search === 'string'
        ? req.query.search.trim().slice(0, 100)
        : '';

    const allowedRoles = ['student', 'alumni'];
    const allowedStatuses = ['approved', 'pending', 'rejected'];

    const roleFilter = allowedRoles.includes(req.query.role)
      ? req.query.role
      : '';

    const statusFilter = allowedStatuses.includes(req.query.status)
      ? req.query.status
      : '';

    // 2. Base filter: Only student and alumni accounts
    const filter = {
      role: { $in: APPLICANT_ROLES }
    };

    // 3. Apply role filter
    if (roleFilter) {
      filter.role = roleFilter;
    }

    // 4. Apply verification status filter
    if (statusFilter) {
      filter.status = statusFilter;
    }

    // 5. Escape special regex characters for safe searching
    if (searchQuery) {
      const escapedSearch = searchQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        '\\$&'
      );

      const searchRegex = new RegExp(escapedSearch, 'i');

      filter.$or = [
        { fullName: searchRegex },
        { rollNumber: searchRegex },
        { email: searchRegex }
      ];
    }

    // 6. Fetch filtered users and pending count
    const [users, pendingCount] = await Promise.all([
      User.find(filter)
        .select('-password')
        .sort({ createdAt: -1 })
        .limit(200)
        .lean(),

      User.countDocuments({
        role: { $in: APPLICANT_ROLES },
        status: 'pending'
      })
    ]);

    // 7. Render the directory
    return res.render('admin/users', {
      title: 'User Management — SkillBridge',
      dbUnavailable: false,
      users,
      searchQuery,
      roleFilter,
      statusFilter,
      pendingCount
    });

  } catch (error) {
    console.error('Admin users error:', error.message);

    return res.status(500).render('admin/users', {
      title: 'User Management — SkillBridge',
      dbUnavailable: true,
      users: [],
      searchQuery: '',
      roleFilter: '',
      statusFilter: '',
      pendingCount: 0
    });
  }
});








// =====================================================
// ADMIN — VIEW INDIVIDUAL USER PROFILE
// =====================================================

router.get('/users/:userId', requireAuth, requireAdmin, async (req, res) => {
    try {
        if (!isDbConnected()) {
            return renderUnavailable(
                res,
                'Database is currently unavailable. Please try again later.'
            );
        }

        const { userId } = req.params;

        if (!isValidObjectId(userId)) {
            return renderNotFound(res);
        }

        // Fetch user without password
        const user = await User.findOne({
            _id: userId,
            role: { $in: APPLICANT_ROLES }
        })
            .select('-password')
            .lean();

        if (!user) {
            return renderNotFound(res);
        }

        let completedProjects = [];
        let approvedTaskCount = 0;
        let createdProjects = [];
        let activeMenteeCount = 0;
        let reviewCount = 0;

        // ---------------------------------------------
        // STUDENT PROFILE DATA
        // ---------------------------------------------
        if (user.role === 'student') {
            const memberships = await ProjectMember.find({
                studentId: user._id,
                status: 'completed'
            })
                .populate({
                    path: 'projectId',
                    match: { status: 'completed' },
                    select: 'title description category skills duration status creatorName creatorBatch creatorCompany creatorProfession createdAt'
                })
                .sort({ completedAt: -1, updatedAt: -1 })
                .lean();

            const validMemberships = memberships.filter(
                membership => membership.projectId
            );

            const completedProjectIds = validMemberships.map(
                membership => membership.projectId._id
            );

            const approvedTasks = completedProjectIds.length
                ? await Task.find({
                    assignedTo: user._id,
                    projectId: { $in: completedProjectIds },
                    status: 'completed',
                    reviewDecision: 'approved'
                })
                    .populate('reviewedBy', 'fullName')
                    .sort({ completedAt: -1, updatedAt: -1 })
                    .lean()
                : [];

            completedProjects = validMemberships.map(membership => ({
                membership,
                project: membership.projectId,
                tasks: approvedTasks.filter(
                    task => String(task.projectId) === String(membership.projectId._id)
                )
            }));

            approvedTaskCount = approvedTasks.length;
        }

        // ---------------------------------------------
        // ALUMNI PROFILE DATA
        // ---------------------------------------------
        if (user.role === 'alumni') {
            createdProjects = await Project.find({
                creatorId: user._id
            })
                .select('title description category status maxStudents activeStudentCount createdAt updatedAt')
                .sort({ createdAt: -1 })
                .lean();

            activeMenteeCount = await ProjectMember.countDocuments({
                projectId: { $in: createdProjects.map(project => project._id) },
                status: 'active'
            });

            reviewCount = await Review.countDocuments({
                reviewerId: user._id,
                reviewType: 'alumni_to_student'
            });
        }

        const latestVerification =
            Array.isArray(user.verificationHistory) &&
            user.verificationHistory.length
                ? user.verificationHistory[user.verificationHistory.length - 1]
                : null;

        return res.render('admin/user-profile', {
            title: 'User Profile',
            user,
            completedProjects,
            completedProjectCount: completedProjects.length,
            approvedTaskCount,
            createdProjects,
            activeMenteeCount,
            reviewCount,
            latestVerification
        });

    } catch (error) {
        console.error('Admin user profile error:', error);
        return res.status(500).render('500', {
            title: 'Server Error',
            error: 'Unable to load this user profile.'
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
