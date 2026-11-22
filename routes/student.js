
// ─────────────────────────────────────────────
// routes/student.js — Current MCA Student Routes
// ─────────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const bcrypt = require('bcryptjs');
const fs = require('fs/promises');

const upload = require('../middleware/upload');
const User = require('../models/User');
const Proposal = require('../models/Proposal');
const Task = require('../models/Task');
const Project = require('../models/Project');
const ProjectMember = require('../models/ProjectMember');
const Review = require('../models/Review');
const { isDbConnected } = require('../config/db');

const {
  requireAuth,
  requireApproved,
  requireRole
} = require('../middleware/auth');

const REGISTRATION_TITLE =
  'Current MCA Student Registration — SkillBridge';

// ─────────────────────────────────────────────
// Helper functions
// ─────────────────────────────────────────────

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function removeUploadedFile(file) {
  if (!file || !file.path) return;

  try {
    await fs.unlink(file.path);
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.error('Uploaded file cleanup error:', error.message);
    }
  }
}

function registrationFormData(data = {}) {
  return {
    fullName: data.fullName || '',
    email: data.email || '',
    mobile: data.mobile || '',
    rollNumber: data.rollNumber || '',
    currentYear: data.currentYear || '',
    admissionBatch: data.admissionBatch || '',
    expectedGradYear: data.expectedGradYear || ''
  };
}

function renderRegistration(res, errors = [], formData = {}) {
  return res.render('student/register', {
    title: REGISTRATION_TITLE,
    errors,
    formData: registrationFormData(formData)
  });
}

// ─────────────────────────────────────────────
// GET /student/register
// Student registration form
// ─────────────────────────────────────────────

router.get('/register', (req, res) => {
  if (req.session.user?.role === 'student') {
    return res.redirect('/student/dashboard');
  }

  return renderRegistration(res);
});

// ─────────────────────────────────────────────
// POST /student/register
// Process student registration
// ─────────────────────────────────────────────

router.post(
  '/register',
  upload.single('document'),
  async (req, res) => {
    const {
      fullName,
      email,
      mobile,
      rollNumber,
      currentYear,
      admissionBatch,
      expectedGradYear,
      password,
      confirmPassword
    } = req.body;

    const cleanName = typeof fullName === 'string'
      ? fullName.trim()
      : '';

    const cleanEmail = typeof email === 'string'
      ? email.trim().toLowerCase()
      : '';

    const cleanMobile = typeof mobile === 'string'
      ? mobile.trim()
      : '';

    const cleanRoll = typeof rollNumber === 'string'
      ? rollNumber.trim().toUpperCase()
      : '';

    const cleanBatch = typeof admissionBatch === 'string'
      ? admissionBatch.trim()
      : '';

    const cleanGradYear = typeof expectedGradYear === 'string'
      ? expectedGradYear.trim()
      : '';

    const formData = {
      fullName: cleanName,
      email: cleanEmail,
      mobile: cleanMobile,
      rollNumber: cleanRoll,
      currentYear,
      admissionBatch: cleanBatch,
      expectedGradYear: cleanGradYear
    };

    const errors = [];

    if (cleanName.length < 2 || cleanName.length > 120) {
      errors.push({
        msg: 'Full name must contain between 2 and 120 characters.'
      });
    }

    if (!isValidEmail(cleanEmail) || cleanEmail.length > 254) {
      errors.push({
        msg: 'A valid email address is required.'
      });
    }

    if (cleanRoll.length < 4 || cleanRoll.length > 30) {
      errors.push({
        msg: 'A valid MCA roll number is required.'
      });
    }

    if (cleanMobile && cleanMobile.length > 20) {
      errors.push({
        msg: 'Mobile number cannot exceed 20 characters.'
      });
    }

    if (!['1', '2'].includes(currentYear)) {
      errors.push({
        msg: 'Please select your current year of study.'
      });
    }

    if (!/^\d{4}$/.test(cleanBatch)) {
      errors.push({
        msg: 'Admission batch must be a valid 4-digit year.'
      });
    }

    if (!/^\d{4}$/.test(cleanGradYear)) {
      errors.push({
        msg: 'Expected graduation year must be a valid 4-digit year.'
      });
    }

    if (
      /^\d{4}$/.test(cleanBatch) &&
      /^\d{4}$/.test(cleanGradYear) &&
      Number(cleanGradYear) <= Number(cleanBatch)
    ) {
      errors.push({
        msg: 'Expected graduation year must be after admission year.'
      });
    }

    if (typeof password !== 'string' || password.length < 8) {
      errors.push({
        msg: 'Password must be at least 8 characters long.'
      });
    }

    if (password !== confirmPassword) {
      errors.push({
        msg: 'Passwords do not match.'
      });
    }

    if (!req.file) {
      errors.push({
        msg: 'Student ID card or bonafide certificate is required.'
      });
    }

    if (errors.length > 0) {
      await removeUploadedFile(req.file);
      return renderRegistration(res, errors, formData);
    }

    if (!isDbConnected()) {
      await removeUploadedFile(req.file);

      return res.status(503).render('503', {
        title: 'Service Temporarily Unavailable',
        message: 'Registration is temporarily unavailable. Please try again later.'
      });
    }

    try {
      const existingUser = await User.findOne({
        $or: [
          { email: cleanEmail },
          {
            role: { $in: ['student', 'alumni'] },
            rollNumber: cleanRoll
          }
        ]
      }).select('_id');

      if (existingUser) {
        await removeUploadedFile(req.file);

        return renderRegistration(
          res,
          [{
            msg: 'An account with this email address or MCA roll number already exists.'
          }],
          formData
        );
      }

      const hashedPassword = await bcrypt.hash(password, 12);

      const newStudent = new User({
        fullName: cleanName,
        email: cleanEmail,
        password: hashedPassword,
        mobile: cleanMobile,
        role: 'student',
        status: 'pending',
        rollNumber: cleanRoll,
        currentYear,
        admissionBatch: cleanBatch,
        expectedGradYear: cleanGradYear,
        documentFilename: req.file.filename,
        documentOriginalName: req.file.originalname,
        documentMimeType: req.file.mimetype,
        documentSizeBytes: req.file.size
      });

      await newStudent.save();

      return res.render('student/register', {
        title: REGISTRATION_TITLE,
        errors: [],
        formData: {},
        success: `Registration received! Your application (Roll: ${cleanRoll}) has been submitted for administrator verification. You can check your status at /status.`
      });

    } catch (error) {
      await removeUploadedFile(req.file);

      console.error('Student registration error:', error.message);

      if (error.code === 11000) {
        return res.status(409).render('student/register', {
          title: REGISTRATION_TITLE,
          errors: [{
            msg: 'An account with this email address or MCA roll number already exists.'
          }],
          formData
        });
      }

      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(item => ({
          msg: item.message
        }));

        return renderRegistration(res, validationErrors, formData);
      }

      return res.status(500).render('student/register', {
        title: 'Registration Error',
        errors: [{
          msg: 'Registration could not be completed. Please try again later.'
        }],
        formData
      });
    }
  }
);

// ─────────────────────────────────────────────
// GET /student/dashboard
// Database-backed Student Dashboard
// ─────────────────────────────────────────────

router.get(
  '/dashboard',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).render('503', {
          title: 'Service Temporarily Unavailable',
          message: 'Your dashboard is temporarily unavailable.'
        });
      }

      const studentId = req.session.user._id;
      const today = new Date();

      const [
        currentUser,
        proposals,
        memberships,
        tasks,
        reviews
      ] = await Promise.all([

        User.findById(studentId)
          .select(
            'fullName email rollNumber skills currentYear admissionBatch expectedGradYear'
          )
          .lean(),

        Proposal.find({
          studentId
        })
          .populate({
            path: 'projectId',
            select: 'title description category status deadline creatorName createdAt skills duration'
          })
          .sort({ submittedAt: -1 })
          .lean(),

        ProjectMember.find({
          studentId
        })
          .populate({
            path: 'projectId',
            select: 'title description category status deadline creatorName createdAt'
          })
          .sort({ joinedAt: -1 })
          .lean(),

        Task.find({
          assignedTo: studentId
        })
          .populate({
            path: 'projectId',
            select: 'title status creatorName'
          })
          .sort({ dueDate: 1, createdAt: -1 })
          .lean(),

        Review.find({
          revieweeId: studentId,
          isVisible: true
        })
          .populate({
            path: 'projectId',
            select: 'title'
          })
          .populate({
            path: 'reviewerId',
            select: 'fullName'
          })
          .sort({ createdAt: -1 })
          .lean()
      ]);

      const appliedProjects = proposals
        .filter(proposal => proposal.projectId)
        .map(proposal => ({
          ...proposal.projectId,
          proposals: [proposal]
        }));

      const excludedProjectIds = [
        ...proposals
          .filter(proposal => proposal.projectId)
          .map(proposal => proposal.projectId._id),

        ...memberships
          .filter(membership => membership.projectId)
          .map(membership => membership.projectId._id)
      ];

      const recommendedProjects = await Project.find({
        _id: {
          $nin: excludedProjectIds
        },
        status: 'open',
        $or: [
          { deadline: null },
          { deadline: { $gte: today } }
        ],
        $expr: {
          $lt: [
            { $ifNull: ['$activeStudentCount', 0] },
            '$maxStudents'
          ]
        }
      })
        .select(
          'title description category skills duration deadline creatorName createdAt'
        )
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const pendingProposals = proposals.filter(
        proposal => proposal.status === 'pending'
      ).length;

      const acceptedProposals = proposals.filter(
        proposal => proposal.status === 'accepted'
      ).length;

      const declinedProposals = proposals.filter(
        proposal => proposal.status === 'declined'
      ).length;

      const activeProjects = memberships.filter(
        membership => membership.status === 'active'
      ).length;

      const completedProjects = memberships.filter(
        membership => membership.status === 'completed'
      ).length;

      const completedTasks = tasks.filter(
        task => task.status === 'completed'
      ).length;

      const totalRating = reviews.reduce(
        (sum, review) => sum + review.rating,
        0
      );

      const averageRating = reviews.length > 0
        ? Number((totalRating / reviews.length).toFixed(1))
        : null;

      const stats = {
        totalProposals: proposals.length,
        pendingProposals,
        acceptedProposals,
        declinedProposals,
        activeProjects,
        completedProjects,
        totalTasks: tasks.length,
        completedTasks,
        totalReviews: reviews.length,
        averageRating
      };

      return res.render('student/dashboard', {
        title: 'Student Dashboard — SkillBridge',
        currentUser: currentUser || req.session.user,
        appliedProjects,
        memberships,
        tasks,
        reviews,
        recommendedProjects,
        stats
      });

    } catch (error) {
      console.error('Student dashboard error:', error);

      return res.status(500).render('500', {
        title: 'Dashboard Error',
        message: 'Unable to load your dashboard.'
      });
    }
  }
);

// ─────────────────────────────────────────────
// GET /student/profile
// Database-backed Student Profile & Skills
// ─────────────────────────────────────────────

router.get(
  '/profile',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).render('503', {
          title: 'Service Temporarily Unavailable',
          message: 'Your student profile is temporarily unavailable.'
        });
      }

      const studentId = req.session.user._id;

      const currentUser = await User.findOne({
        _id: studentId,
        role: 'student'
      })
        .select(
          'fullName email mobile rollNumber currentYear admissionBatch expectedGradYear skills status documentFilename documentOriginalName documentMimeType documentSizeBytes verificationHistory linkedin'
        )
        .lean();

      if (!currentUser) {
        return res.status(404).render('404', {
          title: 'Student Not Found',
          message: 'The student profile could not be found.'
        });
      }

      const completedMemberships = await ProjectMember.find({
        studentId,
        status: 'completed'
      })
        .populate({
          path: 'projectId',
          match: {
            status: 'completed'
          },
          select:
            'title description category skills duration status creatorName creatorBatch creatorCompany creatorProfession createdAt'
        })
        .sort({
          completedAt: -1,
          updatedAt: -1
        })
        .lean();

      const validCompletedMemberships = completedMemberships.filter(
        membership => membership.projectId
      );

      const completedProjectIds = validCompletedMemberships.map(
        membership => membership.projectId._id
      );

      let approvedTasks = [];

      if (completedProjectIds.length > 0) {
        approvedTasks = await Task.find({
          assignedTo: studentId,
          projectId: {
            $in: completedProjectIds
          },
          status: 'completed',
          reviewDecision: 'approved'
        })
          .populate({
            path: 'reviewedBy',
            select: 'fullName'
          })
          .sort({
            completedAt: -1,
            updatedAt: -1
          })
          .lean();
      }

      const completedProjects = validCompletedMemberships.map(
        membership => {
          const projectId = String(membership.projectId._id);

          const projectTasks = approvedTasks.filter(
            task => String(task.projectId) === projectId
          );

          return {
            membership,
            project: membership.projectId,
            tasks: projectTasks
          };
        }
      );

      const verificationHistory = Array.isArray(
        currentUser.verificationHistory
      )
        ? currentUser.verificationHistory
        : [];

      const latestVerification = verificationHistory.length > 0
        ? verificationHistory[verificationHistory.length - 1]
        : null;

      return res.render('student/profile', {
        title: 'Student Profile & Skills — SkillBridge',
        currentUser,
        completedProjects,
        completedProjectCount: completedProjects.length,
        approvedTaskCount: approvedTasks.length,
        latestVerification,

        // Profile update feedback
        profileMessage: typeof req.query.message === 'string'
          ? req.query.message
          : null,

        profileMessageType: req.query.type === 'error'
          ? 'error'
          : 'success'
      });

    } catch (error) {
      console.error('Student profile error:', error);

      return res.status(500).render('500', {
        title: 'Profile Error',
        message: 'Unable to load your student profile.'
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST /student/profile/update
// Update student skills, mobile number and LinkedIn
// ─────────────────────────────────────────────

router.post(
  '/profile/update',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {

    const redirectWithMessage = (message, type = 'success') => {
      return res.redirect(
        `/student/profile?type=${type}&message=${encodeURIComponent(message)}`
      );
    };

    if (!isDbConnected()) {
      return res.status(503).render('503', {
        title: 'Service Temporarily Unavailable',
        message: 'Your profile could not be updated right now.'
      });
    }

    try {
      // 1. Read form values safely.
      const skillsInput = typeof req.body.skills === 'string'
        ? req.body.skills
        : null;

      const mobile = typeof req.body.mobile === 'string'
        ? req.body.mobile.trim()
        : null;

      const linkedinInput = typeof req.body.linkedin === 'string'
        ? req.body.linkedin.trim()
        : null;

      // 2. Validate required form fields.
      if (
        skillsInput === null ||
        mobile === null ||
        linkedinInput === null
      ) {
        return redirectWithMessage(
          'Invalid profile form submission. Please try again.',
          'error'
        );
      }

      // 3. Convert skills into a clean array.
      const skills = skillsInput
        .split(/[,\n\r]+/)
        .map(skill => skill.trim())
        .filter(Boolean);

      // Remove duplicate skills without considering letter case.
      const uniqueSkills = [
        ...new Map(
          skills.map(skill => [
            skill.toLowerCase(),
            skill
          ])
        ).values()
      ];

      // 4. Validate skills.
      if (uniqueSkills.length > 30) {
        return redirectWithMessage(
          'You can add a maximum of 30 skills.',
          'error'
        );
      }

      if (uniqueSkills.some(skill => skill.length > 50)) {
        return redirectWithMessage(
          'Each skill must not exceed 50 characters.',
          'error'
        );
      }

      // 5. Validate mobile number.
      if (mobile.length > 20) {
        return redirectWithMessage(
          'Mobile number cannot exceed 20 characters.',
          'error'
        );
      }

      if (
        mobile &&
        !/^\+?[0-9\s()-]{7,20}$/.test(mobile)
      ) {
        return redirectWithMessage(
          'Please enter a valid mobile number.',
          'error'
        );
      }

      // 6. Validate LinkedIn URL.
      let linkedin = '';

      if (linkedinInput) {
        let parsedLinkedin;

        try {
          const linkedinUrl = /^https?:\/\//i.test(linkedinInput)
            ? linkedinInput
            : `https://${linkedinInput}`;

          parsedLinkedin = new URL(linkedinUrl);

        } catch {
          return redirectWithMessage(
            'Please enter a valid LinkedIn profile URL.',
            'error'
          );
        }

        const validLinkedInHost = [
          'linkedin.com',
          'www.linkedin.com'
        ].includes(parsedLinkedin.hostname.toLowerCase());

        if (
          parsedLinkedin.protocol !== 'https:' ||
          !validLinkedInHost ||
          !parsedLinkedin.pathname.startsWith('/in/')
        ) {
          return redirectWithMessage(
            'Please enter a valid HTTPS LinkedIn profile URL, such as https://www.linkedin.com/in/your-profile.',
            'error'
          );
        }

        linkedin = parsedLinkedin.href;
      }

      // 7. Update only the permitted fields of the logged-in student.
      const updatedUser = await User.findOneAndUpdate(
        {
          _id: req.session.user._id,
          role: 'student',
          status: 'approved'
        },
        {
          $set: {
            skills: uniqueSkills,
            mobile,
            linkedin
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedUser) {
        return redirectWithMessage(
          'Student account not found. Please sign in again.',
          'error'
        );
      }

      console.log(
        `Student profile updated: ${updatedUser._id}`
      );

      return redirectWithMessage(
        'Your profile has been updated successfully.'
      );

    } catch (error) {
      console.error('Student profile update error:', error);

      if (error.name === 'ValidationError') {
        return redirectWithMessage(
          'Some profile information is invalid. Please check your entries.',
          'error'
        );
      }

      return redirectWithMessage(
        'Unable to update your profile. Please try again.',
        'error'
      );
    }
  }
);

// ─────────────────────────────────────────────
// GET /student/tasks
// Tasks assigned to the logged-in student
// ─────────────────────────────────────────────

router.get(
  '/tasks',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {
    try {
      if (!isDbConnected()) {
        return res.status(503).render('503', {
          title: 'Service Temporarily Unavailable',
          message: 'Your assigned tasks are temporarily unavailable.'
        });
      }

      const tasks = await Task.find({
        assignedTo: req.session.user._id
      })
        .populate({
          path: 'projectId',
          select: 'title status creatorName'
        })
        .sort({ dueDate: 1, createdAt: -1 })
        .lean();

      return res.render('student/tasks', {
        title: 'Assigned Tasks',
        tasks,
        message: typeof req.query.message === 'string'
          ? req.query.message
          : null
      });

    } catch (error) {
      console.error('Student tasks error:', error.message);

      return res.status(500).render('500', {
        title: 'Tasks Error',
        message: 'Unable to load your assigned tasks.'
      });
    }
  }
);

// ─────────────────────────────────────────────
// POST /student/tasks/:taskId/start
// Start an assigned task
// todo → in_progress
// ─────────────────────────────────────────────

router.post(
  '/tasks/:taskId/start',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {
    const { taskId } = req.params;
    const studentId = req.session.user._id;

    const redirectToTasks = (message) => {
      return res.redirect(
        `/student/tasks?message=${encodeURIComponent(message)}`
      );
    };

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).send('Invalid task ID.');
    }

    if (!isDbConnected()) {
      return res.status(503).render('503', {
        title: 'Service Temporarily Unavailable',
        message: 'Task status could not be updated.'
      });
    }

    try {
      const task = await Task.findOne({
        _id: taskId,
        assignedTo: studentId
      })
        .select('_id projectId status')
        .lean();

      if (!task) {
        return res.status(404).send(
          'Task not found or you are not authorized to access it.'
        );
      }

      const membership = await ProjectMember.exists({
        projectId: task.projectId,
        studentId,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).send(
          'You are no longer an active member of this project.'
        );
      }

      if (task.status !== 'todo') {
        return redirectToTasks(
          'Only tasks in the To Do column can be started.'
        );
      }

      const updatedTask = await Task.findOneAndUpdate(
        {
          _id: task._id,
          assignedTo: studentId,
          status: 'todo'
        },
        {
          $set: {
            status: 'in_progress'
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedTask) {
        return redirectToTasks(
          'The task status changed. Please refresh your task list.'
        );
      }

      console.log(
        `Student started task ${updatedTask._id}`
      );

      return redirectToTasks(
        'Task started successfully.'
      );

    } catch (error) {
      console.error('Student task start error:', error);

      return redirectToTasks(
        'Unable to start this task. Please try again.'
      );
    }
  }
);

// ─────────────────────────────────────────────
// POST /student/tasks/:taskId/submit
// Submit completed work for alumni review
// in_progress → review
// ─────────────────────────────────────────────

router.post(
  '/tasks/:taskId/submit',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {

    const { taskId } = req.params;
    const studentId = req.session.user._id;

    const redirectToTasks = (message) => {
      return res.redirect(
        `/student/tasks?message=${encodeURIComponent(message)}`
      );
    };

    if (!mongoose.isValidObjectId(taskId)) {
      return res.status(400).send('Invalid task ID.');
    }

    if (!isDbConnected()) {
      return res.status(503).render('503', {
        title: 'Service Temporarily Unavailable',
        message: 'Your task submission could not be processed.'
      });
    }

    try {
      const repositoryUrl =
        typeof req.body.repositoryUrl === 'string'
          ? req.body.repositoryUrl.trim()
          : '';

      const deliverableUrl =
        typeof req.body.deliverableUrl === 'string'
          ? req.body.deliverableUrl.trim()
          : '';

      const submissionNotes =
        typeof req.body.submissionNotes === 'string'
          ? req.body.submissionNotes.trim()
          : '';

      if (!repositoryUrl) {
        return redirectToTasks(
          'GitHub repository URL is required.'
        );
      }

      if (repositoryUrl.length > 500) {
        return redirectToTasks(
          'Repository URL must not exceed 500 characters.'
        );
      }

      if (deliverableUrl.length > 500) {
        return redirectToTasks(
          'Deliverable URL must not exceed 500 characters.'
        );
      }

      if (!submissionNotes) {
        return redirectToTasks(
          'Please provide completion notes.'
        );
      }

      if (submissionNotes.length > 3000) {
        return redirectToTasks(
          'Completion notes must not exceed 3000 characters.'
        );
      }

      let parsedRepositoryUrl;

      try {
        parsedRepositoryUrl = new URL(repositoryUrl);
      } catch {
        return redirectToTasks(
          'Please enter a valid GitHub repository URL.'
        );
      }

      const validGitHubHost = [
        'github.com',
        'www.github.com'
      ].includes(parsedRepositoryUrl.hostname);

      const repositoryParts = parsedRepositoryUrl.pathname
        .split('/')
        .filter(Boolean);

      if (
        parsedRepositoryUrl.protocol !== 'https:' ||
        !validGitHubHost ||
        repositoryParts.length < 2
      ) {
        return redirectToTasks(
          'Enter a valid HTTPS GitHub repository URL.'
        );
      }

      if (deliverableUrl) {
        try {
          const parsedDeliverableUrl = new URL(deliverableUrl);

          if (
            !['http:', 'https:'].includes(
              parsedDeliverableUrl.protocol
            )
          ) {
            return redirectToTasks(
              'Deliverable URL must use HTTP or HTTPS.'
            );
          }

        } catch {
          return redirectToTasks(
            'Please enter a valid deliverable URL.'
          );
        }
      }

      const task = await Task.findOne({
        _id: taskId,
        assignedTo: studentId
      })
        .select('_id projectId status')
        .lean();

      if (!task) {
        return res.status(404).send(
          'Task not found or you are not authorized to access it.'
        );
      }

      const membership = await ProjectMember.exists({
        projectId: task.projectId,
        studentId,
        status: 'active'
      });

      if (!membership) {
        return res.status(403).send(
          'You are no longer an active member of this project.'
        );
      }

      if (task.status !== 'in_progress') {
        return redirectToTasks(
          'Only tasks currently in progress can be submitted.'
        );
      }

      const updatedTask = await Task.findOneAndUpdate(
        {
          _id: task._id,
          assignedTo: studentId,
          status: 'in_progress'
        },
        {
          $set: {
            repositoryUrl,
            deliverableUrl,
            submissionNotes,
            submittedAt: new Date(),
            status: 'review',
            reviewFeedback: '',
            reviewedBy: null,
            reviewedAt: null,
            reviewDecision: null
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      if (!updatedTask) {
        return redirectToTasks(
          'The task status changed. Please refresh your task list.'
        );
      }

      console.log(
        `Student submitted task ${updatedTask._id} for review.`
      );

      return redirectToTasks(
        'Work submitted successfully for alumni review.'
      );

    } catch (error) {
      console.error('Student task submission error:', error);

      return redirectToTasks(
        'Unable to submit your work. Please try again.'
      );
    }
  }
);

module.exports = router;
