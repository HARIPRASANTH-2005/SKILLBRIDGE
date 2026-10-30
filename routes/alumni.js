// ─────────────────────────────────────────────
//  routes/alumni.js  —  MCA Alumni Routes
// ─────────────────────────────────────────────
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const upload  = require('../middleware/upload');
const User    = require('../models/User');
const Project = require('../models/Project');
const { isDbConnected } = require('../config/db');
const { requireAuth, requireApproved, requireRole } = require('../middleware/auth');

// GET /alumni/register  → Alumni registration form
router.get('/register', (req, res) => {
  if (req.session.user && req.session.user.role === 'alumni') {
    return res.redirect('/alumni/dashboard');
  }

  res.render('alumni/register', {
    title    : 'MCA Alumni Registration — SkillBridge',
    errors   : [],
    formData : {}
  });
});

// POST /alumni/register  → Process alumni registration
router.post('/register', upload.single('document'), async (req, res) => {
  const {
    fullName, email, mobile, rollNumber,
    admissionBatch, graduationYear, profession, company, linkedin,
    password, confirmPassword
  } = req.body;

  const errors = [];

  if (!fullName || fullName.trim().length < 2) {
    errors.push({ msg: 'Official full name is required.' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push({ msg: 'A valid email address is required.' });
  }
  if (!rollNumber || rollNumber.trim().length < 4) {
    errors.push({ msg: 'Original MCA roll number as recorded at PSG Tech is mandatory.' });
  }
  if (!admissionBatch || !/^[0-9]{4}$/.test(admissionBatch)) {
    errors.push({ msg: 'Admission batch must be a valid 4-digit year.' });
  }
  if (!graduationYear || !/^[0-9]{4}$/.test(graduationYear)) {
    errors.push({ msg: 'Graduation year must be a valid 4-digit year.' });
  }
  if (!password || password.length < 8) {
    errors.push({ msg: 'Password must be at least 8 characters long.' });
  }
  if (password !== confirmPassword) {
    errors.push({ msg: 'Passwords do not match.' });
  }
  if (!req.file) {
    errors.push({ msg: 'MCA graduation certificate or provisional certificate is required for verification.' });
  }

  const cleanRoll = rollNumber ? rollNumber.trim().toUpperCase() : '';
  const cleanEmail = email ? email.toLowerCase().trim() : '';

  if (errors.length > 0) {
    return res.render('alumni/register', {
      title    : 'MCA Alumni Registration — SkillBridge',
      errors,
      formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, admissionBatch, graduationYear, profession, company, linkedin }
    });
  }

  if (isDbConnected()) {
    try {
      const existingUser = await User.findOne({
        $or: [{ email: cleanEmail }, { rollNumber: cleanRoll }]
      });

      if (existingUser) {
        errors.push({ msg: 'An account with this email address or MCA roll number already exists.' });
        return res.render('alumni/register', {
          title    : 'MCA Alumni Registration — SkillBridge',
          errors,
          formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, admissionBatch, graduationYear, profession, company, linkedin }
        });
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);

      const newAlumni = new User({
        fullName: fullName.trim(),
        email: cleanEmail,
        password: hashedPassword,
        mobile: mobile ? mobile.trim() : '',
        role: 'alumni',
        status: 'pending',
        rollNumber: cleanRoll,
        admissionBatch,
        graduationYear,
        profession: profession ? profession.trim() : '',
        company: company ? company.trim() : '',
        linkedin: linkedin ? linkedin.trim() : '',
        documentFilename: req.file.filename,
        documentOriginalName: req.file.originalname,
        documentMimeType: req.file.mimetype,
        documentSizeBytes: req.file.size
      });

      await newAlumni.save();
    } catch (err) {
      console.error('Alumni registration error:', err.message);
      errors.push({ msg: 'Registration could not be completed: ' + err.message });
      return res.render('alumni/register', {
        title    : 'MCA Alumni Registration — SkillBridge',
        errors,
        formData : { fullName, email: cleanEmail, mobile, rollNumber: cleanRoll, admissionBatch, graduationYear, profession, company, linkedin }
      });
    }
  }

  return res.render('alumni/register', {
    title    : 'MCA Alumni Registration — SkillBridge',
    errors   : [],
    formData : {},
    success  : `Registration received! Your degree proof and alumni credentials (Roll: ${cleanRoll}) have been queued for department administrator review. You can check your verification status anytime at /status.`
  });
});

// GET /alumni/dashboard  → Alumni Dashboard
router.get('/dashboard', requireAuth, requireRole('alumni'), async (req, res) => {
  let createdProjects = [];
  if (isDbConnected() && req.session.user && req.session.user._id) {
    try {
      createdProjects = await Project.find({ creatorId: req.session.user._id }).lean();
    } catch (e) {
      console.error('Alumni projects query error:', e.message);
    }
  }

  res.render('alumni/dashboard', {
    title: 'Alumni Dashboard — SkillBridge',
    createdProjects
  });
});

// GET /alumni/profile  → Alumni Profile
router.get('/profile', requireAuth, requireRole('alumni'), (req, res) => {
  res.render('alumni/profile', {
    title: 'Alumni Profile — SkillBridge'
  });
});

// GET /alumni/proposals  → Proposal Review
router.get('/proposals', requireAuth, requireRole('alumni'), async (req, res) => {
  let projectsWithProposals = [];
  if (isDbConnected() && req.session.user && req.session.user._id) {
    try {
      projectsWithProposals = await Project.find({
        creatorId: req.session.user._id,
        'proposals.0': { $exists: true }
      }).lean();
    } catch (e) {
      console.error('Proposals query error:', e.message);
    }
  }

  res.render('alumni/proposals', {
    title: 'Review Student Proposals — SkillBridge',
    projectsWithProposals
  });
});

module.exports = router;
