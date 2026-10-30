// ─────────────────────────────────────────────
//  routes/projects.js  —  Explore Opportunities (Phase A)
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const Project = require('../models/Project');
const { isDbConnected } = require('../config/db');
const { requireAuth, requireApproved, requireRole } = require('../middleware/auth');

// GET /projects  → Explore Opportunities with search, filter, pagination, 503 check
router.get('/', async (req, res) => {
  const { search, category, skill, sort = 'newest', page = 1 } = req.query;
  const currentPage = Math.max(1, parseInt(page, 10) || 1);
  const limit = 12;

  // DB Unreachable State Check (HTTP 503)
  if (!isDbConnected()) {
    return res.status(503).render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects: [],
      total: 0,
      page: 1,
      totalPages: 0,
      search: search || '',
      category: category || '',
      skill: skill || '',
      sort,
      dbUnavailable: true,
      errorMessage: 'Opportunities are temporarily unavailable. The platform administrator has been notified. Try again in a few moments.'
    });
  }

  try {
    const filter = { status: 'open' };

    // Search query over title, description, skills
    if (search && search.trim()) {
      const searchRegex = new RegExp(search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { description: searchRegex },
        { skills: searchRegex }
      ];
    }

    // Category filter
    if (category && category.trim()) {
      filter.category = category.trim().toLowerCase();
    }

    // Skill filter
    if (skill && skill.trim()) {
      filter.skills = new RegExp(skill.trim(), 'i');
    }

    // Sorting
    let sortOptions = { createdAt: -1 }; // newest first by default
    if (sort === 'deadline') {
      sortOptions = { deadline: 1, createdAt: -1 };
    }

    const total = await Project.countDocuments(filter);
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (currentPage - 1) * limit;

    const projects = await Project.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .lean();

    res.render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects,
      total,
      page: currentPage,
      totalPages,
      search: search || '',
      category: category || '',
      skill: skill || '',
      sort,
      dbUnavailable: false,
      errorMessage: null
    });
  } catch (err) {
    console.error('Projects query error:', err.message);
    res.status(503).render('projects/index', {
      title: 'Explore Opportunities — SkillBridge',
      projects: [],
      total: 0,
      page: 1,
      totalPages: 0,
      search: search || '',
      category: category || '',
      skill: skill || '',
      sort,
      dbUnavailable: true,
      errorMessage: 'Opportunities are temporarily unavailable. The platform administrator has been notified. Try again in a few moments.'
    });
  }
});

// GET /projects/create  → Create a new project (Alumni only, approved)
router.get('/create', requireAuth, requireApproved, requireRole('alumni'), (req, res) => {
  res.render('projects/create', {
    title: 'Post New Opportunity — SkillBridge',
    errors: [],
    formData: {}
  });
});

// POST /projects  → Handle project creation
router.post('/', requireAuth, requireApproved, requireRole('alumni'), async (req, res) => {
  const { title, description, category, skills, duration, deadline, maxStudents, cadence } = req.body;
  const errors = [];

  if (!title || title.trim().length < 5) {
    errors.push({ msg: 'Project title is required (at least 5 characters).' });
  }
  if (!description || description.trim().length < 20) {
    errors.push({ msg: 'Detailed project description is required (at least 20 characters).' });
  }

  if (errors.length > 0) {
    return res.render('projects/create', {
      title: 'Post New Opportunity — SkillBridge',
      errors,
      formData: req.body
    });
  }

  if (!isDbConnected()) {
    return res.status(503).render('500', {
      title: '503 — Service Unavailable',
      error: 'Database is currently offline. Your opportunity could not be published. Please try again shortly.'
    });
  }

  try {
    const skillsArray = skills
      ? (Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean))
      : [];

    const newProject = new Project({
      title: title.trim(),
      description: description.trim(),
      category: category || 'web',
      skills: skillsArray,
      duration: duration || '4 Weeks',
      deadline: deadline ? new Date(deadline) : null,
      maxStudents: parseInt(maxStudents, 10) || 1,
      cadence: cadence || 'weekly',
      status: 'open',
      creatorId: req.session.user._id,
      creatorName: req.session.user.fullName,
      creatorBatch: req.session.user.graduationYear || '',
      creatorCompany: req.session.user.company || '',
      creatorProfession: req.session.user.profession || ''
    });

    await newProject.save();
    res.redirect(`/projects/${newProject._id}`);
  } catch (err) {
    console.error('Project save error:', err.message);
    res.status(500).render('projects/create', {
      title: 'Post New Opportunity — SkillBridge',
      errors: [{ msg: 'Failed to create project: ' + err.message }],
      formData: req.body
    });
  }
});

// GET /projects/:id  → View project details
router.get('/:id', async (req, res) => {
  const projectId = req.params.id;

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
      return res.status(404).render('404', {
        title: 'Opportunity Not Found — SkillBridge'
      });
    }

    // Check if current user already submitted a proposal
    let alreadyApplied = false;
    if (req.session && req.session.user && project.proposals) {
      alreadyApplied = project.proposals.some(
        p => p.studentId && p.studentId.toString() === req.session.user._id?.toString()
      );
    }

    res.render('projects/show', {
      title: `${project.title} — SkillBridge`,
      project,
      projectId,
      dbUnavailable: false,
      alreadyApplied,
      message: req.query.msg || null
    });
  } catch (err) {
    console.error('Project details error:', err.message);
    return res.status(404).render('404', {
      title: 'Opportunity Not Found — SkillBridge'
    });
  }
});

// POST /projects/:id/proposals  → Submit proposal (Verified students only)
router.post('/:id/proposals', requireAuth, requireApproved, requireRole('student'), async (req, res) => {
  const projectId = req.params.id;
  const { pitch, hoursPerWeek, targetWeeks, repoUrl } = req.body;

  if (!pitch || pitch.trim().length < 15) {
    return res.redirect(`/projects/${projectId}?msg=pitch_required`);
  }

  if (!isDbConnected()) {
    return res.status(503).render('500', {
      title: '503 — Service Unavailable',
      error: 'Database is currently offline. Proposal could not be saved.'
    });
  }

  try {
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).render('404', { title: 'Opportunity Not Found' });
    }

    // Check if already applied
    const hasApplied = project.proposals.some(
      p => p.studentId && p.studentId.toString() === req.session.user._id.toString()
    );
    if (hasApplied) {
      return res.redirect(`/projects/${projectId}?msg=already_submitted`);
    }

    project.proposals.push({
      studentId: req.session.user._id,
      studentName: req.session.user.fullName,
      studentRoll: req.session.user.rollNumber || '24MCA001',
      pitch: pitch.trim(),
      hoursPerWeek: parseInt(hoursPerWeek, 10) || 10,
      targetWeeks: parseInt(targetWeeks, 10) || 4,
      repoUrl: repoUrl ? repoUrl.trim() : '',
      status: 'pending',
      submittedAt: new Date()
    });

    await project.save();
    res.redirect(`/projects/${projectId}?msg=proposal_submitted`);
  } catch (err) {
    console.error('Proposal submit error:', err.message);
    res.redirect(`/projects/${projectId}?msg=error`);
  }
});

// GET /projects/:id/tasks  → View project task board
router.get('/:id/tasks', requireAuth, requireApproved, async (req, res) => {
  const projectId = req.params.id;

  if (!isDbConnected()) {
    return res.status(503).render('500', {
      title: '503 — Service Unavailable',
      error: 'Database is currently offline. Task board is unavailable.'
    });
  }

  try {
    const project = await Project.findById(projectId).lean();
    if (!project) {
      return res.status(404).render('404', { title: 'Opportunity Not Found' });
    }

    res.render('projects/tasks', {
      title: `Task Board — ${project.title}`,
      project,
      projectId
    });
  } catch (err) {
    res.status(404).render('404', { title: 'Opportunity Not Found' });
  }
});

module.exports = router;
