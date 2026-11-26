
// ─────────────────────────────────────────────
// routes/projects.js
// Project Browsing, Creation & Proposal Management
// ─────────────────────────────────────────────

const express = require('express');
const mongoose = require('mongoose');

const router = express.Router();

const Project = require('../models/Project');
const Proposal = require('../models/Proposal');
const Task = require('../models/Task');
const ProjectMember = require('../models/ProjectMember');
const Review = require('../models/Review');

const { isDbConnected } = require('../config/db');

const {
  requireAuth,
  requireApproved,
  requireRole
} = require('../middleware/auth');


// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const isValidObjectId = (id) => {
  return mongoose.isValidObjectId(id);
};

const isValidEmailUrl = (value) => {
  if (!value) return true;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};

const escapeRegex = (value) => {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const renderServiceUnavailable = (res, message) => {
  return res.status(503).render('500', {
    title: '503 — Service Unavailable',
    error: message
  });
};

const renderProjectNotFound = (res) => {
  return res.status(404).render('404', {
    title: 'Opportunity Not Found — SkillBridge'
  });
};


// ─────────────────────────────────────────────
// GET /projects
// Explore opportunities
// ─────────────────────────────────────────────

router.get('/', async (req, res) => {
  const {
    search,
    category,
    skill,
    sort = 'newest'
  } = req.query;

  const requestedPage = parseInt(req.query.page, 10) || 1;
  const currentPage = Math.max(1, requestedPage);
  const limit = 12;

  const cleanSearch =
    typeof search === 'string' ? search.trim().slice(0, 100) : '';

  const cleanCategory =
    typeof category === 'string' ? category.trim().toLowerCase() : '';

  const cleanSkill =
    typeof skill === 'string' ? skill.trim().slice(0, 60) : '';

  const allowedCategories = [
    'web',
    'cloud',
    'mobile',
    'data',
    'systems',
    'ai',
    'general'
  ];

  const allowedSorts = ['newest', 'deadline'];

  const selectedSort = allowedSorts.includes(sort)
    ? sort
    : 'newest';

  const formData = {
    search: cleanSearch,
    category: cleanCategory,
    skill: cleanSkill,
    sort: selectedSort
  };

  if (!isDbConnected()) {
    return res.status(503).render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects: [],
      total: 0,
      page: 1,
      totalPages: 0,
      ...formData,
      dbUnavailable: true,
      errorMessage:
        'Opportunities are temporarily unavailable. Please try again later.'
    });
  }

  try {
    const filter = {
      status: 'open'
    };

    if (cleanSearch) {
      const searchRegex = new RegExp(
        escapeRegex(cleanSearch),
        'i'
      );

      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { skills: searchRegex }
      ];
    }

    if (
      cleanCategory &&
      allowedCategories.includes(cleanCategory)
    ) {
      filter.category = cleanCategory;
    }

    if (cleanSkill) {
      filter.skills = new RegExp(
        escapeRegex(cleanSkill),
        'i'
      );
    }

    const sortOptions =
      selectedSort === 'deadline'
        ? { deadline: 1, createdAt: -1 }
        : { createdAt: -1 };

    const total = await Project.countDocuments(filter);

    const totalPages = Math.ceil(total / limit);

    const safePage = totalPages
      ? Math.min(currentPage, totalPages)
      : 1;

    const skip = (safePage - 1) * limit;

    const projects = await Project.find(filter)
      .select(
        'title description category skills duration deadline maxStudents cadence status creatorName creatorBatch creatorCompany creatorProfession createdAt'
      )
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    return res.render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects,
      total,
      page: safePage,
      totalPages,
      ...formData,
      dbUnavailable: false,
      errorMessage: null
    });

  } catch (err) {
    console.error('Projects query error:', err.message);

    return res.status(503).render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects: [],
      total: 0,
      page: 1,
      totalPages: 0,
      ...formData,
      dbUnavailable: true,
      errorMessage:
        'Opportunities are temporarily unavailable. Please try again later.'
    });
  }
});


// ─────────────────────────────────────────────
// GET /projects/create
// Display project creation form
// Alumni only
// ─────────────────────────────────────────────

router.get(
  '/create',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  (req, res) => {
    res.render('projects/create', {
      title: 'Post New Opportunity — SkillBridge',
      errors: [],
      formData: {}
    });
  }
);


// ─────────────────────────────────────────────
// POST /projects
// Create a new project
// Alumni only
// ─────────────────────────────────────────────

router.post(
  '/',
  requireAuth,
  requireApproved,
  requireRole('alumni'),
  async (req, res) => {
    const {
      title,
      description,
      category,
      skills,
      duration,
      deadline,
      maxStudents,
      cadence
    } = req.body;

    const errors = [];

    const cleanTitle =
      typeof title === 'string' ? title.trim() : '';

    const cleanDescription =
      typeof description === 'string'
        ? description.trim()
        : '';

    if (cleanTitle.length < 5 || cleanTitle.length > 160) {
      errors.push({
        msg: 'Project title must contain between 5 and 160 characters.'
      });
    }

    if (
      cleanDescription.length < 20 ||
      cleanDescription.length > 10000
    ) {
      errors.push({
        msg: 'Project description must contain between 20 and 10000 characters.'
      });
    }

    const allowedCategories = [
      'web',
      'cloud',
      'mobile',
      'data',
      'systems',
      'ai',
      'general'
    ];

    const cleanCategory =
      typeof category === 'string'
        ? category.trim().toLowerCase()
        : 'web';

    if (!allowedCategories.includes(cleanCategory)) {
      errors.push({
        msg: 'Please select a valid project category.'
      });
    }

    const parsedMaxStudents =
      maxStudents === undefined || maxStudents === ''
        ? 1
        : Number(maxStudents);

    if (
      !Number.isInteger(parsedMaxStudents) ||
      parsedMaxStudents < 1 ||
      parsedMaxStudents > 100
    ) {
      errors.push({
        msg: 'Maximum students must be between 1 and 100.'
      });
    }

    let parsedDeadline = null;

    if (deadline) {
      parsedDeadline = new Date(deadline);

      if (Number.isNaN(parsedDeadline.getTime())) {
        errors.push({
          msg: 'Please provide a valid project deadline.'
        });
      }
    }

    const cleanSkills = (
      Array.isArray(skills)
        ? skills
        : typeof skills === 'string'
          ? skills.split(',')
          : []
    )
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 30);

    if (cleanSkills.some((item) => item.length > 50)) {
      errors.push({
        msg: 'Each skill must contain no more than 50 characters.'
      });
    }

    const allowedCadences = [
      'daily',
      'weekly',
      'biweekly',
      'monthly',
      'async'
    ];

    const cleanCadence =
      typeof cadence === 'string'
        ? cadence.trim().toLowerCase()
        : 'weekly';

    if (!allowedCadences.includes(cleanCadence)) {
      errors.push({
        msg: 'Please select a valid project meeting cadence.'
      });
    }

    const cleanDuration =
      typeof duration === 'string' && duration.trim()
        ? duration.trim().slice(0, 60)
        : '4 Weeks';

    if (errors.length > 0) {
      return res.status(400).render('projects/create', {
        title: 'Post New Opportunity — SkillBridge',
        errors,
        formData: req.body
      });
    }

    if (!isDbConnected()) {
      return renderServiceUnavailable(
        res,
        'Database is currently offline. Your project could not be published.'
      );
    }

    try {
      const newProject = new Project({
        title: cleanTitle,
        description: cleanDescription,
        category: cleanCategory,
        skills: cleanSkills,
        duration: cleanDuration,
        deadline: parsedDeadline,
        maxStudents: parsedMaxStudents,
        cadence: cleanCadence,
        status: 'open',

        creatorId: req.session.user._id,
        creatorName: req.session.user.fullName,
        creatorBatch: req.session.user.graduationYear || '',
        creatorCompany: req.session.user.company || '',
        creatorProfession: req.session.user.profession || ''
      });

      await newProject.save();

      return res.redirect(`/projects/${newProject._id}`);

    } catch (err) {
      console.error('Project creation error:', err);

      return res.status(400).render('projects/create', {
        title: 'Post New Opportunity — SkillBridge',
        errors: [
          {
            msg: 'Project could not be created. Please verify your details and try again.'
          }
        ],
        formData: req.body
      });
    }
  }
);


// ─────────────────────────────────────────────
// GET /projects/:id
// View project details
// ─────────────────────────────────────────────

router.get('/:id', async (req, res) => {
  const projectId = req.params.id;

  if (!isValidObjectId(projectId)) {
    return renderProjectNotFound(res);
  }

  if (!isDbConnected()) {
    return res.status(503).render('projects/show', {
      title: 'Opportunity Unavailable — SkillBridge',
      project: null,
      projectId,
      dbUnavailable: true,
      alreadyApplied: false,
      message: null
    });
  }

  try {
    const project = await Project.findById(projectId).lean();

    if (!project) {
      return renderProjectNotFound(res);
    }

    let alreadyApplied = false;
    let existingProposalStatus = null;

    if (
      req.session &&
      req.session.user &&
      req.session.user.role === 'student'
    ) {
      const proposal = await Proposal.findOne({
        projectId: project._id,
        studentId: req.session.user._id
      })
        .select('status')
        .lean();

      if (proposal) {
        alreadyApplied = true;
        existingProposalStatus = proposal.status;
      }
    }

    return res.render('projects/show', {
      title: `${project.title} — SkillBridge`,
      project,
      projectId,
      dbUnavailable: false,
      alreadyApplied,
      existingProposalStatus,
      message: req.query.msg || null
    });

  } catch (err) {
    console.error('Project details error:', err.message);

    return res.status(503).render('projects/show', {
      title: 'Opportunity Unavailable — SkillBridge',
      project: null,
      projectId,
      dbUnavailable: true,
      alreadyApplied: false,
      message: null
    });
  }
});


// ─────────────────────────────────────────────
// POST /projects/:id/proposals
// Submit a project proposal
// Approved students only
// ─────────────────────────────────────────────

router.post(
  '/:id/proposals',
  requireAuth,
  requireApproved,
  requireRole('student'),
  async (req, res) => {
    const projectId = req.params.id;

    const {
      pitch,
      hoursPerWeek,
      targetWeeks,
      repoUrl
    } = req.body;

    if (!isValidObjectId(projectId)) {
      return renderProjectNotFound(res);
    }

    const cleanPitch =
      typeof pitch === 'string' ? pitch.trim() : '';

    const parsedHours = Number(hoursPerWeek);
    const parsedWeeks =
      targetWeeks === undefined || targetWeeks === ''
        ? 4
        : Number(targetWeeks);

    const cleanRepoUrl =
      typeof repoUrl === 'string' ? repoUrl.trim() : '';

    if (cleanPitch.length < 15 || cleanPitch.length > 5000) {
      return res.redirect(
        `/projects/${projectId}?msg=pitch_required`
      );
    }

    if (
      !Number.isInteger(parsedHours) ||
      parsedHours < 1 ||
      parsedHours > 60
    ) {
      return res.redirect(
        `/projects/${projectId}?msg=invalid_hours`
      );
    }

    if (
      !Number.isInteger(parsedWeeks) ||
      parsedWeeks < 1 ||
      parsedWeeks > 104
    ) {
      return res.redirect(
        `/projects/${projectId}?msg=invalid_duration`
      );
    }

    if (
      cleanRepoUrl.length > 500 ||
      !isValidEmailUrl(cleanRepoUrl)
    ) {
      return res.redirect(
        `/projects/${projectId}?msg=invalid_repo_url`
      );
    }

    if (!isDbConnected()) {
      return renderServiceUnavailable(
        res,
        'Database is offline. Your proposal could not be submitted.'
      );
    }

    try {
      const project = await Project.findById(projectId)
        .select('title status maxStudents creatorId')
        .lean();

      if (!project) {
        return renderProjectNotFound(res);
      }

      if (project.status !== 'open') {
        return res.redirect(
          `/projects/${projectId}?msg=project_closed`
        );
      }

      if (
        project.creatorId.toString() ===
        req.session.user._id.toString()
      ) {
        return res.redirect(
          `/projects/${projectId}?msg=owner_cannot_apply`
        );
      }

      const existingProposal = await Proposal.findOne({
        projectId,
        studentId: req.session.user._id
      })
        .select('_id')
        .lean();

      if (existingProposal) {
        return res.redirect(
          `/projects/${projectId}?msg=already_submitted`
        );
      }

      const newProposal = new Proposal({
        projectId,
        studentId: req.session.user._id,
        studentName: req.session.user.fullName,
        studentRoll: req.session.user.rollNumber,
        pitch: cleanPitch,
        hoursPerWeek: parsedHours,
        targetWeeks: parsedWeeks,
        repoUrl: cleanRepoUrl,
        status: 'pending'
      });

      await newProposal.save();

      return res.redirect(
        `/projects/${projectId}?msg=proposal_submitted`
      );

    } catch (err) {
      console.error('Proposal submission error:', err.message);

      if (err.code === 11000) {
        return res.redirect(
          `/projects/${projectId}?msg=already_submitted`
        );
      }

      return res.redirect(
        `/projects/${projectId}?msg=error`
      );
    }
  }
);


// ─────────────────────────────────────────────
// GET /projects/:id/tasks
// View project task board
// Project owner, active member, or completed member
// ─────────────────────────────────────────────

router.get(
  '/:id/tasks',
  requireAuth,
  requireApproved,
  async (req, res) => {
    const projectId = req.params.id;

    if (!isValidObjectId(projectId)) {
      return renderProjectNotFound(res);
    }

    if (!isDbConnected()) {
      return renderServiceUnavailable(
        res,
        'Database is offline. The task board is unavailable.'
      );
    }

    try {
      // 1. Find the project.
      const project = await Project.findById(projectId).lean();

      if (!project) {
        return renderProjectNotFound(res);
      }

      const userId = req.session.user._id;

      // 2. Check whether the logged-in user owns this project.
      const isOwner =
        project.creatorId.toString() === userId.toString();

      // 3. Check membership for non-owners.
      let membership = null;

      if (!isOwner) {
        const requiredMembershipStatus =
          project.status === 'completed'
            ? 'completed'
            : 'active';

        membership = await ProjectMember.findOne({
          projectId: project._id,
          studentId: userId,
          status: requiredMembershipStatus
        })
          .select('_id status')
          .lean();
      }

      // 4. Block users who are neither the owner nor an
      // authorized project member.
      if (!isOwner && !membership) {
        return res.status(403).render('500', {
          title: '403 — Project Access Denied',
          error:
            'Only the project owner and authorized project members can access this task board.'
        });
      }

      const isCompletedMember =
        !isOwner &&
        membership &&
        membership.status === 'completed';

      // 5. Load project tasks and assigned student details.
      const tasks = await Task.find({
        projectId: project._id
      })
        .populate('assignedTo', 'fullName rollNumber')
        .sort({ createdAt: -1 })
        .lean();

      // 6. Load active members for the task assignment dropdown.
      const members = isOwner
        ? await ProjectMember.find({
            projectId: project._id,
            status: 'active'
          })
            .populate('studentId', 'fullName rollNumber')
            .sort({ joinedAt: 1 })
            .lean()
        : [];

      // 7. Load completed members and their reviews.
      // This information is only needed by the project owner
      // after the project has been completed.
      let reviewMembers = [];

      if (isOwner && project.status === 'completed') {
        const completedMembers = await ProjectMember.find({
          projectId: project._id,
          status: 'completed'
        })
          .populate('studentId', 'fullName rollNumber email')
          .sort({ joinedAt: 1 })
          .lean();

        const existingReviews = await Review.find({
          projectId: project._id,
          reviewerId: project.creatorId,
          reviewType: 'alumni_to_student'
        }).lean();

        // Match each completed student with their review,
        // if the alumni has already submitted one.
        const reviewMap = new Map(
          existingReviews.map((review) => [
            review.revieweeId.toString(),
            review
          ])
        );

        reviewMembers = completedMembers
          .filter((member) => member.studentId)
          .map((member) => ({
            ...member,
            review: reviewMap.get(
              member.studentId._id.toString()
            ) || null
          }));
      }

      // 8. Render the task board.
      return res.render('projects/tasks', {
        title: `Task Board — ${project.title}`,
        project,
        projectId,
        tasks,
        members,
        isOwner,
        isCompletedMember,
        reviewMembers,
        message:
          typeof req.query.message === 'string'
            ? req.query.message
            : null
      });

    } catch (err) {
      console.error('Task board error:', err);

      return renderServiceUnavailable(
        res,
        'Unable to load the project task board. Please try again later.'
      );
    }
  }
);


module.exports = router;
